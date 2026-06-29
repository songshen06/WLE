export const DEFAULT_FITNESS = 25;
const CTL_DAYS = 42;
const ATL_DAYS = 7;

export function calculateTrainingLoad(duration, avgHr) {
  const minutes = Number(duration);
  const heartRate = Number(avgHr);

  if (!Number.isFinite(minutes) || !Number.isFinite(heartRate)) {
    return 0;
  }

  return ((heartRate - 100) * minutes) / 10;
}

export function calculateEma(previousValue, currentValue, periodDays) {
  const alpha = 2 / (periodDays + 1);
  return previousValue + alpha * (currentValue - previousValue);
}

export function getInitialFitness(seed = {}) {
  const ctl = Number.isFinite(Number(seed.ctl)) ? Number(seed.ctl) : DEFAULT_FITNESS;
  const atl = Number.isFinite(Number(seed.atl)) ? Number(seed.atl) : DEFAULT_FITNESS;

  return {
    ctl,
    atl,
    tsb: ctl - atl,
  };
}

export function calculateNextFitness(previousFitness, entry) {
  const load = Number.isFinite(Number(entry.trainingLoad))
    ? Number(entry.trainingLoad)
    : calculateTrainingLoad(entry.duration, entry.avgHr);
  const ctl = calculateEma(previousFitness.ctl, load, CTL_DAYS);
  const atl = calculateEma(previousFitness.atl, load, ATL_DAYS);

  return {
    trainingLoad: load,
    ctl,
    atl,
    tsb: ctl - atl,
  };
}

export function getLatestFitness(entries, seed) {
  const latestEntry = entries.at(-1);

  if (
    latestEntry &&
    Number.isFinite(Number(latestEntry.ctl)) &&
    Number.isFinite(Number(latestEntry.atl)) &&
    Number.isFinite(Number(latestEntry.tsb))
  ) {
    return {
      ctl: Number(latestEntry.ctl),
      atl: Number(latestEntry.atl),
      tsb: Number(latestEntry.tsb),
    };
  }

  return getInitialFitness(seed);
}

export function migrateEntriesToRecursiveState(entries, seed, options = {}) {
  let changed = false;
  let previousFitness = getInitialFitness(seed);
  const forceRecalculate = options.forceRecalculate === true;

  const migratedEntries = entries.map((entry, index) => {
    const hasStoredState =
      Number.isFinite(Number(entry.trainingLoad)) &&
      Number.isFinite(Number(entry.ctl)) &&
      Number.isFinite(Number(entry.atl)) &&
      Number.isFinite(Number(entry.tsb));

    if (hasStoredState && !forceRecalculate) {
      previousFitness = {
        ctl: Number(entry.ctl),
        atl: Number(entry.atl),
        tsb: Number(entry.tsb),
      };
      return entry;
    }

    const nextFitness = calculateNextFitness(previousFitness, entry);
    previousFitness = {
      ctl: nextFitness.ctl,
      atl: nextFitness.atl,
      tsb: nextFitness.tsb,
    };
    changed = true;

    console.log(forceRecalculate ? "[WLE state:recalculate]" : "[WLE state:migrate]", {
      index,
      date: entry.date,
      seedCtl: index === 0 ? getInitialFitness(seed).ctl : undefined,
      seedAtl: index === 0 ? getInitialFitness(seed).atl : undefined,
      dailyLoad: nextFitness.trainingLoad,
      ctl: nextFitness.ctl,
      atl: nextFitness.atl,
      tsb: nextFitness.tsb,
    });

    return {
      ...entry,
      trainingLoad: nextFitness.trainingLoad,
      ctl: nextFitness.ctl,
      atl: nextFitness.atl,
      tsb: nextFitness.tsb,
    };
  });

  return {
    entries: migratedEntries,
    changed,
  };
}

export function getRecommendation(tsb) {
  if (tsb < -10) {
    return {
      label: "Recovery",
      title: "Recovery Day",
      intent: "Absorb the load. Keep movement easy or rest completely.",
      workout: "30-40 min light ride or full rest",
      hrRange: "<115",
      duration: "30-40 min",
      action: "REST",
      tone: "recovery",
    };
  }

  if (tsb <= 5) {
    return {
      label: "Fat Loss",
      title: "Fat Loss Zone (Main)",
      intent: "Do steady Zone 2 work. This is the default waist-loss session.",
      workout: "45 min Zone 2 cardio",
      hrRange: "115-128",
      duration: "45 min",
      action: "TRAIN",
      tone: "main",
    };
  }

  return {
    label: "Performance",
    title: "Performance Day",
    intent: "You are fresh enough to add controlled intensity.",
    workout: "Zone 2 base with short Zone 3 blocks",
    hrRange: "125-150",
    duration: "45-60 min",
    action: "PUSH",
    tone: "performance",
  };
}

export function buildTodayDecision(entries, seed) {
  const fitness = getLatestFitness(entries, seed);

  return {
    ...fitness,
    recommendation: getRecommendation(fitness.tsb),
  };
}
