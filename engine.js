const DEFAULT_FITNESS = 25;
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

export function calculateFitness(entries) {
  let ctl = DEFAULT_FITNESS;
  let atl = DEFAULT_FITNESS;

  for (const entry of entries) {
    const load = calculateTrainingLoad(entry.duration, entry.avgHr);
    ctl = calculateEma(ctl, load, CTL_DAYS);
    atl = calculateEma(atl, load, ATL_DAYS);
  }

  return {
    ctl,
    atl,
    tsb: ctl - atl,
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

export function buildTodayDecision(entries) {
  const fitness = calculateFitness(entries);

  return {
    ...fitness,
    recommendation: getRecommendation(fitness.tsb),
  };
}
