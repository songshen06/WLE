import {
  buildTodayDecision,
  calculateNextFitness,
  calculateTrainingLoad,
  getLatestFitness,
  migrateEntriesToRecursiveState,
} from "./engine.js";

const STORAGE_KEY = "waist-loss-engine.entries.v1";

const elements = {
  form: document.querySelector("#entry-form"),
  duration: document.querySelector("#duration"),
  avgHr: document.querySelector("#avg-hr"),
  type: document.querySelector("#type"),
  ctl: document.querySelector("#ctl"),
  atl: document.querySelector("#atl"),
  tsb: document.querySelector("#tsb"),
  action: document.querySelector("#action"),
  label: document.querySelector("#label"),
  title: document.querySelector("#recommendation-title"),
  intent: document.querySelector("#intent"),
  workout: document.querySelector("#workout"),
  hrRange: document.querySelector("#hr-range"),
  durationOut: document.querySelector("#duration-out"),
  todayCard: document.querySelector("#today-card"),
  history: document.querySelector("#history-list"),
  emptyHistory: document.querySelector("#empty-history"),
};

function readEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      console.warn("[WLE state:read] localStorage value is not an array. Resetting to empty state.");
      return [];
    }

    return parsed;
  } catch {
    console.warn("[WLE state:read] localStorage parse failed. Resetting to empty state.");
    return [];
  }
}

function writeEntries(entries) {
  console.log("[WLE state:write]", {
    storageKey: STORAGE_KEY,
    entryCount: entries.length,
    latestEntry: entries.at(-1) || null,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatNumber(value) {
  return value.toFixed(1);
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(isoDate));
}

function renderToday(entries) {
  const decision = buildTodayDecision(entries);
  const recommendation = decision.recommendation;

  console.log("[WLE state:decision]", {
    entries: entries.length,
    ctl: decision.ctl,
    atl: decision.atl,
    tsb: decision.tsb,
    action: recommendation.action,
    label: recommendation.label,
  });

  elements.ctl.textContent = formatNumber(decision.ctl);
  elements.atl.textContent = formatNumber(decision.atl);
  elements.tsb.textContent = formatNumber(decision.tsb);
  elements.action.textContent = recommendation.action;
  elements.label.textContent = recommendation.label;
  elements.title.textContent = recommendation.title;
  elements.intent.textContent = recommendation.intent;
  elements.workout.textContent = recommendation.workout;
  elements.hrRange.textContent = recommendation.hrRange;
  elements.durationOut.textContent = recommendation.duration;

  elements.todayCard.dataset.tone = recommendation.tone;
}

function renderHistory(entries) {
  const recentEntries = [...entries].slice(-7).reverse();
  elements.history.innerHTML = "";
  elements.emptyHistory.hidden = recentEntries.length > 0;

  for (const entry of recentEntries) {
    const load = Number.isFinite(Number(entry.trainingLoad))
      ? Number(entry.trainingLoad)
      : calculateTrainingLoad(entry.duration, entry.avgHr);
    const item = document.createElement("li");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>${formatDate(entry.date)}</strong>
        <span>${entry.type}</span>
      </div>
      <div>
        <span>${entry.duration} min</span>
        <span>${entry.avgHr} bpm</span>
        <span>${formatNumber(load)} load</span>
      </div>
    `;
    elements.history.append(item);
  }
}

function traceState(entries) {
  console.table(
    entries.map((entry, index) => ({
      index,
      date: entry.date,
      type: entry.type,
      duration: entry.duration,
      avgHr: entry.avgHr,
      dailyLoad: Number(entry.trainingLoad),
      ctl: Number(entry.ctl),
      atl: Number(entry.atl),
      tsb: Number(entry.tsb),
    })),
  );
}

function render() {
  let entries = readEntries();
  const migration = migrateEntriesToRecursiveState(entries);

  if (migration.changed) {
    entries = migration.entries;
    writeEntries(entries);
  }

  traceState(entries);
  renderToday(entries);
  renderHistory(entries);
}

function handleSubmit(event) {
  event.preventDefault();

  const duration = Number(elements.duration.value);
  const avgHr = Number(elements.avgHr.value);

  if (duration <= 0 || avgHr <= 0) {
    return;
  }

  let entries = readEntries();
  const migration = migrateEntriesToRecursiveState(entries);

  if (migration.changed) {
    entries = migration.entries;
  }

  const previousFitness = getLatestFitness(entries);
  const draftEntry = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    duration,
    avgHr,
    type: elements.type.value,
  };
  const nextFitness = calculateNextFitness(previousFitness, draftEntry);
  const nextEntry = {
    ...draftEntry,
    trainingLoad: nextFitness.trainingLoad,
    ctl: nextFitness.ctl,
    atl: nextFitness.atl,
    tsb: nextFitness.tsb,
  };

  console.log("[WLE state:append]", {
    previousCtl: previousFitness.ctl,
    previousAtl: previousFitness.atl,
    previousTsb: previousFitness.tsb,
    dailyLoad: nextEntry.trainingLoad,
    ctl: nextEntry.ctl,
    atl: nextEntry.atl,
    tsb: nextEntry.tsb,
  });

  writeEntries([...entries, nextEntry]);
  elements.form.reset();
  elements.type.value = "bike";
  render();
}

elements.form.addEventListener("submit", handleSubmit);
render();
