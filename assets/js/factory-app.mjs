import {
  CARDS,
  CYCLE_BUDGET,
  KINDS,
  ROOMS,
  SCENARIOS,
  SEVERE_HARM,
  benchmarks,
  cardById,
  createScenario,
  evaluateChange,
  formatDelta,
  leverageTranslation,
  measurementIsStale,
  planCost,
  replayFutures,
  roomLabel,
  runCycle
} from "./factory.mjs";

const root = document.querySelector("[data-factory]");

if (root) {
  let state = createScenario(SCENARIOS[0].id);
  let buy = new Set();
  let rooms = {};
  let lapse = state.lapseOnEscape;
  let prediction = "";
  let difficulty = "hard";
  let started = false;
  let helpReturnFocus = null;
  let guidance = new Map();
  let guidanceToken = 0;

  const $ = (selector) => root.querySelector(selector);
  const elements = {
    scenarioPicker: $("[data-scenario-picker]"),
    prompt: $("[data-scenario-prompt]"),
    cycle: $("[data-cycle]"),
    budget: $("[data-budget]"),
    owner: $("[data-owner]"),
    seed: $("[data-seed]"),
    readout: $("[data-readout]"),
    metrics: $("[data-metrics]"),
    rooms: $("[data-rooms]"),
    lapse: $("[data-lapse]"),
    cards: $("[data-cards]"),
    prediction: $("[data-prediction]"),
    notice: $("[data-notice]"),
    run: $("[data-run-cycle]"),
    receipt: $("[data-receipt]"),
    history: $("[data-history]"),
    debrief: $("[data-debrief]"),
    reset: $("[data-reset]"),
    helpLayer: $("[data-help-layer]"),
    helpDrawer: $("[data-help-drawer]"),
    helpOpen: $("[data-help-open]"),
    helpClose: root.querySelectorAll("[data-help-close]"),
    modeButtons: root.querySelectorAll("[data-mode]"),
    modeSummary: $("[data-mode-summary]")
  };

  const easy = () => difficulty === "easy";
  const complete = () => state.cycle >= state.maxCycles;
  const pct = (value) => `${Math.round(value * 100)}%`;
  const roomMode = (id) => rooms[id] || state.rooms.find((room) => room.id === id).mode;

  function track(name, parameters = {}) {
    window.leverageAnalytics?.track(name, { scenario_id: state.scenarioId, ...parameters });
  }

  function markStarted(action) {
    if (started) return;
    started = true;
    track("simulation_started", { guidance_mode: difficulty, start_action: action });
  }

  function currentPlan() {
    return { buy: [...buy], rooms: Object.fromEntries(state.rooms.map((room) => [room.id, roomMode(room.id)])), lapseOnEscape: lapse };
  }

  function consequenceTag(room) {
    if (room.consequence >= 8) return { label: "severe", tone: "severe" };
    if (room.consequence >= 2) return { label: "moderate", tone: "moderate" };
    return { label: "low", tone: "low" };
  }

  // Scenario picker, mode and status

  function renderScenarioPicker() {
    elements.scenarioPicker.innerHTML = SCENARIOS.map((scenario) => `
      <button class="scenario-tab" type="button" data-scenario="${scenario.id}" aria-pressed="${scenario.id === state.scenarioId}">
        <span class="scenario-tab__name">${scenario.name}</span>
        <span class="scenario-tab__prompt">${scenario.prompt}</span>
      </button>
    `).join("");
    elements.scenarioPicker.querySelectorAll("[data-scenario]").forEach((button) => {
      button.addEventListener("click", () => {
        track("scenario_selected", { scenario_id: button.dataset.scenario });
        resetScenario(button.dataset.scenario);
      });
    });
  }

  function renderMode() {
    root.dataset.difficulty = difficulty;
    elements.modeButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.mode === difficulty)));
    elements.modeSummary.textContent = easy()
      ? "Easy mode shows defects still in production and runs each choice through 24 futures of the rest of the run."
      : "Hard mode hides defects still in production until the end.";
  }

  function renderStatus() {
    const spent = planCost({ buy: [...buy] });
    elements.prompt.textContent = state.prompt;
    elements.cycle.textContent = `${state.cycle} / ${state.maxCycles}`;
    elements.budget.textContent = `${CYCLE_BUDGET - spent} / ${CYCLE_BUDGET}`;
    elements.owner.textContent = `${state.ownerMinutes / 60}h / week`;
    elements.seed.textContent = state.seed;
    elements.run.disabled = complete();
    elements.run.textContent = complete() ? "Scenario complete" : `Run cycle ${state.cycle + 1}`;
  }

  // 01 Observe

  function renderReadout() {
    const last = state.history[state.history.length - 1];
    const measured = state.measured;
    const stale = measurementIsStale(state);
    const measuredBody = measured
      ? `<ul class="kind-rates">${Object.entries(measured.rates).map(([kind, rate]) => `
          <li><span>${KINDS[kind].label}</span><strong>${pct(rate)}</strong></li>`).join("")}</ul>
         <p class="readout-note ${stale ? "is-stale" : ""}">${stale ? "Stale: the checks changed after cycle " + measured.cycle + ". Measure again." : "Measured in cycle " + measured.cycle + ", on dark-room changes."}</p>`
      : `<p class="readout-value readout-value--muted">Not measured</p><p class="readout-note">Buy “Measure the checks” to replay known defects through them.</p>`;

    const latentCell = easy()
      ? `<p class="readout-value">${last ? last.latentCount : 0}</p><p class="readout-note">${last ? `defects worth ${last.latentHarm.toFixed(0)} harm, not yet surfaced` : "none yet"}</p>`
      : `<p class="readout-value readout-value--muted">Unknown</p><p class="readout-note">A real factory can’t see these. Switch to Easy to look.</p>`;

    elements.readout.innerHTML = `
      <div>
        <p class="readout-label">Catch rate the factory reports</p>
        <p class="readout-value">${last ? pct(last.observedCatchRate) : "—"}</p>
        <p class="readout-note">${last ? `caught before merge, against incidents so far${easy() ? ` · true rate ${pct(last.trueCatchRate)}` : ""}` : "reported after cycle 1"}</p>
      </div>
      <div>
        <p class="readout-label">What the checks actually catch</p>
        ${measuredBody}
      </div>
      <div>
        <p class="readout-label">Defects still in production</p>
        ${latentCell}
      </div>
    `;
  }

  function renderMetrics() {
    const last = state.history[state.history.length - 1];
    const metrics = [
      { label: "Value shipped / week", value: last ? last.valuePerWeek.toFixed(1) : "—", note: last ? `${last.mergedPerWeek.toFixed(0)} changes merged / week` : "measured after cycle 1", accent: true },
      { label: "Harm from incidents", value: last ? last.harmSurfaced.toFixed(0) : "—", note: last ? `${last.surfaced} incidents this cycle` : "reaches customers later" },
      { label: "Your hours / week", value: last ? `${last.ownerHoursPerWeek.toFixed(1)}h` : "—", note: last ? `${last.incidentHoursPerWeek.toFixed(1)}h of it on incidents` : `budget ${state.ownerMinutes / 60}h for review` },
      { label: "Review queue", value: last ? `${last.queueAtEnd}` : `${state.queue.length}`, note: last ? `changes waited ${last.averageWaitWeeks.toFixed(1)} weeks on average` : "changes waiting for you" }
    ];
    elements.metrics.innerHTML = metrics.map((metric) => `
      <div class="metric-card ${metric.accent ? "metric-card--accent" : ""}">
        <dt>${metric.label}</dt>
        <dd>${metric.value}</dd>
        <span>${metric.note}</span>
      </div>
    `).join("");
  }

  // 02 Rooms

  function incidentsSoFar(id) {
    return state.receipts.reduce((sum, receipt) => sum + (receipt.incidentsByRoom[id] || 0), 0);
  }

  function renderRooms() {
    const lastReceipt = state.receipts[state.receipts.length - 1];
    elements.rooms.innerHTML = ROOMS.map((base) => {
      const room = state.rooms.find((candidate) => candidate.id === base.id);
      const mode = roomMode(room.id);
      const tag = consequenceTag(room);
      const lapsed = lastReceipt?.lapsed.includes(room.id);
      const impact = guidance.get(`room:${room.id}`);
      const cue = easy() && !complete()
        ? `<span class="guidance-cue guidance-cue--${impact ? impact.classification : "pending"}">${impact ? roomGuidanceText(impact, mode) : "Running futures…"}</span>`
        : "";
      const easyFacts = easy()
        ? `<div><dt>Harm merged</dt><dd>${(state.harmByRoom[room.id] || 0).toFixed(0)}</dd></div>`
        : "";
      return `
        <article class="room-card room-card--${mode} ${impact && easy() ? `is-impact-${impact.classification}` : ""}">
          <div class="room-card__topline">
            <span class="consequence consequence--${tag.tone}">${tag.label} consequence</span>
            ${lapsed ? '<span class="flag flag--actual">lapsed</span>' : ""}
          </div>
          <h4>${room.label}</h4>
          <dl class="stage-stats room-stats">
            <div><dt>Changes / wk</dt><dd>${room.volume}</dd></div>
            <div><dt>Review</dt><dd>${room.reviewMinutes} min</dd></div>
            <div><dt>Unread</dt><dd>${room.unread.toFixed(0)}</dd></div>
            <div><dt>Incidents</dt><dd>${incidentsSoFar(room.id)}</dd></div>
            ${easyFacts}
          </dl>
          ${cue}
          <div class="room-toggle" role="group" aria-label="${room.label}: lit or dark">
            <button type="button" data-room="${room.id}" data-set="lit" aria-pressed="${mode === "lit"}" ${complete() ? "disabled" : ""}>Lit · you read</button>
            <button type="button" data-room="${room.id}" data-set="dark" aria-pressed="${mode === "dark"}" ${complete() ? "disabled" : ""}>Dark · merges on green</button>
          </div>
        </article>
      `;
    }).join("");

    elements.rooms.querySelectorAll("[data-room]").forEach((button) => {
      button.addEventListener("click", () => {
        markStarted("room");
        const room = state.rooms.find((candidate) => candidate.id === button.dataset.room);
        if (button.dataset.set === room.mode) {
          delete rooms[room.id];
        } else {
          rooms[room.id] = button.dataset.set;
        }
        planChanged();
      });
    });

    elements.lapse.checked = lapse;
    elements.lapse.disabled = complete();
  }

  function roomGuidanceText(impact, mode) {
    const move = mode === "dark" ? "Back to lit" : "Going dark";
    return `${move}: ${guidanceLabel(impact)}`;
  }

  // 03 Cards

  function renderCards() {
    const spent = planCost({ buy: [...buy] });
    elements.cards.innerHTML = CARDS.map((card) => {
      const owned = !card.repeatable && state.owned.includes(card.id);
      const active = buy.has(card.id);
      const unaffordable = !active && spent + card.cost > CYCLE_BUDGET;
      const disabled = owned || unaffordable || complete();
      const impact = guidance.get(`card:${card.id}`);
      const showCue = easy() && !owned && !complete() && (!unaffordable || active);
      const cue = showCue
        ? `<span class="guidance-cue guidance-cue--${impact ? impact.classification : "pending"}">${impact ? cardGuidanceText(impact) : "Running futures…"}</span>`
        : "";
      return `
        <button class="investment-card ${active ? "is-selected" : ""} ${owned ? "is-owned" : ""} ${showCue && impact ? `is-impact-${impact.classification}` : ""}"
          type="button" data-card="${card.id}" aria-pressed="${active}" ${disabled ? "disabled" : ""}>
          <span class="investment-card__topline">
            <strong>${card.label}</strong>
            <span>${owned ? "In place" : `${card.cost} pts`}</span>
          </span>
          ${cue}
          <span class="investment-card__mechanism">${card.mechanism}</span>
          <span class="investment-card__risk">Limit · ${card.sideEffect}</span>
        </button>
      `;
    }).join("");

    elements.cards.querySelectorAll("[data-card]").forEach((button) => {
      button.addEventListener("click", () => {
        markStarted("card");
        const id = button.dataset.card;
        buy.has(id) ? buy.delete(id) : buy.add(id);
        planChanged();
      });
    });
  }

  function cardGuidanceText(impact) {
    const context = impact.basis === "contribution" ? "Selected" : "With this plan";
    return `${context}: ${guidanceLabel(impact)}`;
  }

  function guidanceLabel(impact) {
    const net = `${formatDelta(impact.netDelta, 0)} net`;
    switch (impact.classification) {
      case "deferred":
        return `looks good now (${formatDelta(impact.nextNetDelta, 0)} next cycle), costs later (${net})`;
      case "risky":
        return `pays on average (${net}), worse worst case (${formatDelta(impact.harmP90Delta, 0)} harm)`;
      case "helpful":
        return `helpful (${net})`;
      case "harmful":
        return `harmful (${net})`;
      case "learning":
        return "learning value: shows what the checks catch";
      default:
        return "no material change";
    }
  }

  // Easy-mode guidance runs futures, so it is computed after the page paints
  // and cached until the plan changes.
  function scheduleGuidance() {
    guidance = new Map();
    if (!easy() || complete()) return;
    const token = ++guidanceToken;
    const plan = { buy: [...buy], rooms: { ...rooms } };
    const jobs = [
      ...ROOMS.map((room) => ({ key: `room:${room.id}`, change: { type: "room", id: room.id } })),
      ...CARDS.map((card) => ({ key: `card:${card.id}`, change: { type: "card", id: card.id } }))
    ];
    const base = { ...state, lapseOnEscape: lapse };
    const step = () => {
      if (token !== guidanceToken) return;
      const job = jobs.shift();
      if (!job) return;
      const result = evaluateChange(base, plan, job.change, { count: 24 });
      if (result) guidance.set(job.key, result);
      if (!jobs.length || jobs.length % 4 === 0) {
        renderRooms();
        renderCards();
      }
      window.setTimeout(step, 0);
    };
    window.setTimeout(step, 30);
  }

  // 04 Predict

  function renderPrediction() {
    const options = [...ROOMS.map((room) => ({ id: room.id, label: room.label })), { id: "none", label: "No incident" }];
    elements.prediction.innerHTML = options.map((option) => `
      <button type="button" class="prediction-chip" data-predict="${option.id}" aria-pressed="${prediction === option.id}" ${complete() ? "disabled" : ""}>${option.label}</button>
    `).join("");
    elements.prediction.querySelectorAll("[data-predict]").forEach((button) => {
      button.addEventListener("click", () => {
        markStarted("prediction");
        prediction = button.dataset.predict;
        clearNotice();
        renderPrediction();
      });
    });
  }

  // Receipt

  function renderReceipt() {
    const receipt = state.receipts[state.receipts.length - 1];
    if (!receipt) {
      elements.receipt.hidden = true;
      return;
    }
    const changed = Object.keys(receipt.roomsBefore)
      .filter((id) => receipt.roomsBefore[id] !== state.plans[receipt.cycle - 1].rooms[id])
      .map((id) => `${roomLabel(id)} → ${state.plans[receipt.cycle - 1].rooms[id]}`);
    const plan = [...receipt.bought.map((id) => cardById(id).short), ...changed].join(" · ") || "No change";
    const costliest = receipt.costliest
      ? `${roomLabel(receipt.costliest.room)} · ${KINDS[receipt.costliest.kind].label.toLowerCase()} · ${receipt.costliest.harm.toFixed(0)} harm`
      : "No incident";

    elements.receipt.hidden = false;
    elements.receipt.innerHTML = `
      <div class="receipt__stamp">Cycle receipt · weeks ${(receipt.cycle - 1) * 6 + 1}–${receipt.cycle * 6}</div>
      <div class="receipt__grid">
        <div><span>Plan</span><strong>${plan}</strong></div>
        <div><span>Your prediction</span><strong>${roomLabel(receipt.prediction)}</strong></div>
        <div><span>Costliest incident</span><strong>${costliest}</strong></div>
        <div><span>Value shipped</span><strong>${receipt.metric.valuePerWeek.toFixed(1)} / week</strong></div>
      </div>
      <p class="receipt__result ${receipt.predictionCorrect ? "is-correct" : ""}">
        ${receipt.predictionCorrect ? "Prediction matched." : "Prediction missed."}
        ${receipt.metric.surfaced} incidents reached customers, ${receipt.metric.harmSurfaced.toFixed(0)} harm in all.
      </p>
      ${receiptNotes(receipt).map((note) => `<p class="receipt__interpretation">${note}</p>`).join("")}
    `;
  }

  function receiptNotes(receipt) {
    const notes = [];
    const metric = receipt.metric;
    if (receipt.lapsed.length) {
      notes.push(`${receipt.lapsed.map(roomLabel).join(", ")} went back to lit after a first incident. You can grant ${receipt.lapsed.length > 1 ? "them" : "it"} again next cycle.`);
    }
    if (receipt.poisonStopped) {
      notes.push("A compromised package release was stopped before it merged.");
    }
    if (easy() && metric.harmCommitted > metric.harmSurfaced * 1.5 && metric.harmCommitted > 10) {
      notes.push(`This cycle merged ${metric.harmCommitted.toFixed(0)} harm and surfaced ${metric.harmSurfaced.toFixed(0)}. The difference hasn’t arrived yet.`);
    }
    if (metric.peakLoad > 1.5) {
      notes.push("Your review queue outgrew your week, so you skimmed, and reviews caught less.");
    }
    if (metric.incidentHoursPerWeek > 2) {
      notes.push(`Incidents took ${metric.incidentHoursPerWeek.toFixed(1)} hours of your week, leaving less for review.`);
    }
    if (!notes.length) {
      notes.push(metric.surfaced
        ? "Each incident is evidence about a room. One incident says little about the checks as a whole."
        : "A quiet cycle is weak evidence. Most escapes take weeks to surface.");
    }
    return notes;
  }

  // History

  function renderHistory() {
    if (!state.history.length) {
      elements.history.innerHTML = '<p class="empty-state">Run a cycle to start the record.</p>';
      return;
    }
    const maximum = Math.max(1, ...state.history.map((metric) => metric.valuePerWeek));
    elements.history.innerHTML = state.history.map((metric) => `
      <div class="history-row history-row--factory">
        <span class="history-row__label">Cycle ${metric.cycle}</span>
        <div class="history-row__bar"><span style="width: ${Math.max(5, (metric.valuePerWeek / maximum) * 100)}%"></span></div>
        <strong>${metric.valuePerWeek.toFixed(1)}</strong>
        <span class="history-row__constraint">${metric.harmSurfaced.toFixed(0)} harm${easy() ? ` · ${metric.harmCommitted.toFixed(0)} merged` : ""}</span>
      </div>
    `).join("");
  }

  // Debrief

  function renderDebrief() {
    if (!complete()) {
      elements.debrief.hidden = true;
      return;
    }
    const totals = state.totals;
    const latentHarm = state.latent.reduce((sum, defect) => sum + defect.harm, 0);
    const net = totals.value - totals.harmCommitted;
    const weeks = state.cycle * 6;
    const hours = (totals.reviewMinutes + totals.incidentMinutes + totals.glanceMinutes) / 60 / weeks;
    const translation = leverageTranslation(state);
    const byRoom = ROOMS.map((room) => ({ id: room.id, harm: state.harmByRoom[room.id] || 0 }));
    const maxRoomHarm = Math.max(1, ...byRoom.map((entry) => entry.harm));

    elements.debrief.hidden = false;
    elements.debrief.innerHTML = `
      <div class="debrief__header">
        <div>
          <p class="eyebrow">Four cycles later</p>
          <h2>${debriefHeadline(latentHarm, totals)}</h2>
        </div>
        <span class="debrief__score">${net.toFixed(0)} <small>value − harm</small></span>
      </div>
      <div class="debrief__facts">
        <div><span>Value shipped</span><strong>${totals.value.toFixed(0)}</strong></div>
        <div><span>Harm that surfaced</span><strong>${totals.harmSurfaced.toFixed(0)}</strong></div>
        <div><span>Harm still in production</span><strong>${latentHarm.toFixed(0)} · ${state.latent.length} defects</strong></div>
        <div><span>Your hours</span><strong>${hours.toFixed(1)}h / week</strong></div>
      </div>
      <div class="debrief__block">
        <h3>Where the harm came from</h3>
        <div class="harm-rooms">
          ${byRoom.map((entry) => `
            <div class="harm-room">
              <span>${roomLabel(entry.id)}</span>
              <div class="harm-room__bar"><span style="width: ${(entry.harm / maxRoomHarm) * 100}%"></span></div>
              <strong>${entry.harm.toFixed(0)}</strong>
            </div>`).join("")}
        </div>
      </div>
      <div class="debrief__block" data-futures>
        <h3>The same decisions in 200 futures</h3>
        <p class="debrief__note">Running…</p>
      </div>
      <div class="debrief__block">
        <h3>In Leverage Lab’s terms</h3>
        <div class="debrief__facts debrief__facts--three">
          <div><span>Build: changes / week</span><strong>${translation.buildPerWeek.toFixed(1)}</strong></div>
          <div><span>Verify: merged changes that were sound</span><strong>${pct(translation.verifyYield)}</strong></div>
          <div><span>Your attention per change</span><strong>${(translation.attentionPerChange * 60).toFixed(1)} min</strong></div>
        </div>
        <p class="debrief__note">This is what your factory would hand <a href="${root.dataset.leverageUrl || "../"}#lab">Leverage Lab</a>’s Build and Verify stages: output, how much of it was sound, and what it cost in scarce attention. It’s a translation between two small models, not a forecast.</p>
      </div>
      <p class="debrief__claim">Autonomy that holds up is granted room by room, on evidence that arrives late. The rooms worth leaving dark are the ones where checks can tell good work from bad and a mistake is cheap.</p>
      <button class="button button--light" type="button" data-debrief-reset>Run another scenario</button>
    `;
    elements.debrief.querySelector("[data-debrief-reset]").addEventListener("click", () => resetScenario(state.scenarioId));
    window.setTimeout(renderFutures, 30);
  }

  function debriefHeadline(latentHarm, totals) {
    if (latentHarm > totals.harmSurfaced * 0.4 && latentHarm > 20) return "The worst of it hasn’t arrived yet.";
    if (totals.harmCommitted > totals.value * 0.3) return "It shipped a lot. It broke a lot.";
    if (state.history[state.history.length - 1].queueAtEnd > 60) return "Nothing broke. Not much shipped.";
    if (totals.harmCommitted < totals.value * 0.15) return "You earned the dark rooms you kept.";
    return "Some rooms were ready. Some weren’t.";
  }

  function renderFutures() {
    const block = elements.debrief.querySelector("[data-futures]");
    if (!block) return;
    const yours = replayFutures(state.scenarioId, state.plans, { count: 200 });
    const { allLit, allDark } = benchmarks(state.scenarioId, { count: 200 });
    const rows = [
      { label: "Your decisions", summary: yours, accent: true },
      { label: "Read everything", summary: allLit },
      { label: "Read nothing", summary: allDark }
    ];
    const axis = Math.max(...rows.map((row) => row.summary.harmP90)) * 1.05;
    block.innerHTML = `
      <h3>The same decisions in 200 futures</h3>
      <p class="debrief__note">Each future replays your plans with different draws. Harm counts every escape, including those that would surface after week 24. Bars span the middle 80% of futures; the mark is the median.</p>
      <div class="futures">
        ${rows.map((row) => `
          <div class="futures__row ${row.accent ? "is-yours" : ""}">
            <span class="futures__label">${row.label}</span>
            <div class="futures__track" aria-label="Harm from ${row.summary.harmP10.toFixed(0)} to ${row.summary.harmP90.toFixed(0)}, median ${row.summary.harmMedian.toFixed(0)}">
              <span class="futures__range" style="left: ${(row.summary.harmP10 / axis) * 100}%; width: ${Math.max(1, ((row.summary.harmP90 - row.summary.harmP10) / axis) * 100)}%"></span>
              <span class="futures__median" style="left: ${(row.summary.harmMedian / axis) * 100}%"></span>
            </div>
            <span class="futures__stat">harm ${row.summary.harmMedian.toFixed(0)}</span>
            <span class="futures__stat">value ${row.summary.valueMedian.toFixed(0)}</span>
            <span class="futures__stat">${pct(row.summary.severeShare)} with a severe incident</span>
          </div>`).join("")}
      </div>
      <p class="debrief__note">A severe incident is one worth ${SEVERE_HARM} harm or more: wrong charges, exposed accounts, a compromised release.</p>
    `;
  }

  // Help drawer

  function openHelp() {
    track("help_opened", { cycle: state.cycle });
    helpReturnFocus = document.activeElement;
    elements.helpLayer.hidden = false;
    document.body.classList.add("drawer-open");
    requestAnimationFrame(() => {
      elements.helpLayer.classList.add("is-open");
      elements.helpDrawer.focus();
    });
  }

  function closeHelp() {
    elements.helpLayer.classList.remove("is-open");
    document.body.classList.remove("drawer-open");
    window.setTimeout(() => {
      elements.helpLayer.hidden = true;
      helpReturnFocus?.focus();
    }, 180);
  }

  function trapHelpFocus(event) {
    if (event.key === "Escape") {
      closeHelp();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...elements.helpDrawer.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')].filter((element) => !element.disabled);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Actions

  function showNotice(message) {
    elements.notice.textContent = message;
    elements.notice.hidden = false;
  }

  function clearNotice() {
    elements.notice.hidden = true;
    elements.notice.textContent = "";
  }

  function planChanged() {
    clearNotice();
    renderStatus();
    scheduleGuidance();
    renderRooms();
    renderCards();
  }

  function executeCycle() {
    if (!prediction) {
      showNotice("Choose where you expect the costliest incident before running the cycle.");
      elements.prediction.querySelector("button")?.focus();
      return;
    }
    let result;
    try {
      result = runCycle(state, currentPlan(), prediction);
    } catch (error) {
      showNotice(error.message);
      return;
    }
    track("cycle_run", {
      cycle: result.receipt.cycle,
      investment_ids: result.receipt.bought.join(",") || "none",
      prediction: result.receipt.prediction,
      modeled_constraint: result.receipt.actual,
      prediction_correct: result.receipt.predictionCorrect,
      accepted_per_week: Number(result.receipt.metric.valuePerWeek.toFixed(1)),
      guidance_mode: difficulty
    });
    state = result.state;
    buy = new Set();
    rooms = {};
    lapse = state.lapseOnEscape;
    prediction = "";
    render();
    if (complete()) {
      track("simulation_completed", {
        accepted_per_week: Number(result.receipt.metric.valuePerWeek.toFixed(1)),
        guidance_mode: difficulty
      });
    }
    elements.receipt.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetScenario(id) {
    state = createScenario(id);
    buy = new Set();
    rooms = {};
    lapse = state.lapseOnEscape;
    prediction = "";
    started = false;
    render();
  }

  function render() {
    clearNotice();
    renderScenarioPicker();
    renderMode();
    renderStatus();
    renderReadout();
    renderMetrics();
    scheduleGuidance();
    renderRooms();
    renderCards();
    renderPrediction();
    renderReceipt();
    renderHistory();
    renderDebrief();
  }

  elements.run.addEventListener("click", executeCycle);
  elements.reset.addEventListener("click", () => resetScenario(state.scenarioId));
  elements.helpOpen.addEventListener("click", openHelp);
  elements.helpClose.forEach((button) => button.addEventListener("click", closeHelp));
  elements.helpDrawer.addEventListener("keydown", trapHelpFocus);
  elements.lapse.addEventListener("change", () => {
    markStarted("lapse");
    lapse = elements.lapse.checked;
    planChanged();
  });
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      difficulty = button.dataset.mode;
      track("guidance_mode_changed", { guidance_mode: difficulty });
      render();
    });
  });

  render();
}
