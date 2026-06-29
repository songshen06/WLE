import { buildTodayDecision, calculateTrainingLoad } from "./engine.js";

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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries) {
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
    const load = calculateTrainingLoad(entry.duration, entry.avgHr);
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

function render() {
  const entries = readEntries();
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

  const entries = readEntries();
  entries.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    duration,
    avgHr,
    type: elements.type.value,
  });

  writeEntries(entries);
  elements.form.reset();
  elements.type.value = "bike";
  render();
}

elements.form.addEventListener("submit", handleSubmit);
render();
