import {
  INVESTMENTS,
  SCENARIOS,
  STAGES,
  createScenario,
  effectiveCapacity,
  evaluateInvestmentImpact,
  formatDelta,
  investmentCost,
  runCycle,
  stageLabel
} from "./model.mjs";

const root = document.querySelector("[data-simulator]");

const explainer = document.querySelector("[data-explainer]");
explainer?.addEventListener("play", () => {
  window.leverageAnalytics?.track("explainer_played");
}, { once: true });

if (root) {
  let state = createScenario("agent-wave");
  let selected = new Set();
  let prediction = "";
  let hintLevel = 0;
  let difficulty = "hard";
  let simulationStarted = false;
  let helpReturnFocus = null;

  function track(name, parameters = {}) {
    window.leverageAnalytics?.track(name, parameters);
  }

  function markSimulationStarted(startAction) {
    if (simulationStarted) return;
    simulationStarted = true;
    track("simulation_started", {
      scenario_id: state.scenarioId,
      guidance_mode: difficulty,
      start_action: startAction
    });
  }

  const elements = {
    scenarioPicker: root.querySelector("[data-scenario-picker]"),
    scenarioPrompt: root.querySelector("[data-scenario-prompt]"),
    cycle: root.querySelector("[data-cycle]"),
    budget: root.querySelector("[data-budget]"),
    seed: root.querySelector("[data-seed]"),
    diagnosis: root.querySelector("[data-diagnosis]"),
    pipeline: root.querySelector("[data-pipeline]"),
    metrics: root.querySelector("[data-metrics]"),
    investments: root.querySelector("[data-investments]"),
    prediction: root.querySelector("[data-prediction]"),
    run: root.querySelector("[data-run-cycle]"),
    notice: root.querySelector("[data-notice]"),
    receipt: root.querySelector("[data-receipt]"),
    history: root.querySelector("[data-history]"),
    debrief: root.querySelector("[data-debrief]"),
    reset: root.querySelector("[data-reset]"),
    helpLayer: root.querySelector("[data-help-layer]"),
    helpDrawer: root.querySelector("[data-help-drawer]"),
    helpOpen: root.querySelector("[data-help-open]"),
    helpClose: root.querySelectorAll("[data-help-close]"),
    hintButton: root.querySelector("[data-hint-button]"),
    hintPanel: root.querySelector("[data-hint-panel]"),
    modeButtons: root.querySelectorAll("[data-mode]"),
    modeSummary: root.querySelector("[data-mode-summary]")
  };

  function renderMode() {
    root.dataset.difficulty = difficulty;
    elements.modeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.mode === difficulty));
    });
    elements.modeSummary.textContent = difficulty === "easy"
      ? "Easy mode compares every card with your current plan and recalculates after each selection."
      : "Hard mode hides modeled impact until the learning receipt.";
  }

  function renderScenarioPicker() {
    elements.scenarioPicker.innerHTML = SCENARIOS.map((scenario) => `
      <button
        class="scenario-tab"
        type="button"
        data-scenario="${scenario.id}"
        aria-pressed="${scenario.id === state.scenarioId}"
      >
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

  function renderStatus() {
    const spent = investmentCost([...selected]);
    elements.scenarioPrompt.textContent = state.prompt;
    elements.cycle.textContent = `${state.cycle} / ${state.maxCycles}`;
    elements.budget.textContent = `${10 - spent} / 10`;
    elements.seed.textContent = state.seed;
    elements.run.disabled = state.cycle >= state.maxCycles;
    elements.run.textContent = state.cycle >= state.maxCycles
      ? "Scenario complete"
      : `Run cycle ${state.cycle + 1}`;
  }

  function renderDiagnosis() {
    const diagnosis = state.diagnosis;
    const missing = diagnosis.missingEvidence.length
      ? diagnosis.missingEvidence.map(stageLabel).join(" and ")
      : "No material telemetry gaps";

    elements.diagnosis.innerHTML = `
      <div>
        <p class="readout-label">Current telemetry says</p>
        <p class="diagnosis-stage">${stageLabel(diagnosis.perceived)}</p>
      </div>
      <div class="confidence" aria-label="Diagnosis confidence ${diagnosis.confidence} percent">
        <div class="confidence__meta"><span>Confidence</span><strong>${diagnosis.confidence}%</strong></div>
        <div class="confidence__track"><span style="width: ${diagnosis.confidence}%"></span></div>
      </div>
      <p class="diagnosis-missing"><span>Missing evidence</span>${missing}</p>
    `;
  }

  function hintsForCurrentSituation() {
    const actual = state.stages.find((stage) => stage.id === state.diagnosis.actual);
    const perceived = state.stages.find((stage) => stage.id === state.diagnosis.perceived);
    const selectedLabels = [...selected]
      .map((id) => INVESTMENTS.find((investment) => investment.id === id)?.short)
      .filter(Boolean);
    const allocationNote = selectedLabels.length
      ? ` Your current allocation is ${selectedLabels.join(" + ")}.`
      : " You can also spend points on instrumentation before committing to capacity.";

    return [
      {
        label: "Reading hint",
        text: "A queue shows accumulated pressure. It does not prove which stage limits accepted outcomes. Compare yield-adjusted effective capacity across the whole pipeline."
      },
      {
        label: "Evidence hint",
        text: `${stageLabel(perceived.id)} has ${Math.round(perceived.coverage * 100)}% telemetry coverage; ${stageLabel(actual.id)} has ${Math.round(actual.coverage * 100)}%. The most visible stage may be winning the narrative because it is easier to observe.${allocationNote}`
      },
      {
        label: "Model reveal",
        text: `${stageLabel(actual.id)} currently has the lowest yield-adjusted sustainable capacity at ${effectiveCapacity(actual).toFixed(1)} items per week. An intervention can move that constraint, so predict the post-allocation stage—not merely the current one.`
      }
    ];
  }

  function renderHint() {
    if (hintLevel === 0) {
      elements.hintPanel.hidden = true;
      elements.hintPanel.innerHTML = "";
      elements.hintButton.disabled = false;
      elements.hintButton.innerHTML = '<span aria-hidden="true">↳</span> Give me a hint';
      return;
    }

    const hints = hintsForCurrentSituation();
    const hint = hints[Math.min(hintLevel - 1, hints.length - 1)];
    elements.hintPanel.hidden = false;
    elements.hintPanel.innerHTML = `
      <span>${hint.label} · ${hintLevel} of ${hints.length}</span>
      <p>${hint.text}</p>
    `;
    elements.hintButton.innerHTML = hintLevel < hints.length
      ? '<span aria-hidden="true">↳</span> Give me another hint'
      : '<span aria-hidden="true">✓</span> Model constraint revealed';
    elements.hintButton.disabled = hintLevel >= hints.length;
  }

  function openHelp() {
    track("help_opened", { scenario_id: state.scenarioId, cycle: state.cycle });
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

    const focusable = [...elements.helpDrawer.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.disabled);
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

  function renderPipeline() {
    const maximumQueue = Math.max(1, ...state.stages.map((stage) => stage.queue));
    const truthIsVisible = state.receipts.length > 0;

    elements.pipeline.innerHTML = state.stages.map((stage, index) => {
      const isPerceived = state.diagnosis.perceived === stage.id;
      const isActual = truthIsVisible && state.diagnosis.actual === stage.id;
      const queueWidth = Math.max(5, (stage.queue / maximumQueue) * 100);
      const classes = ["stage-card", isPerceived ? "is-perceived" : "", isActual ? "is-actual" : ""]
        .filter(Boolean)
        .join(" ");

      return `
        <li class="pipeline-stage">
          <article class="${classes}">
            <div class="stage-card__topline">
              <span class="stage-number">0${index + 1}</span>
              <span class="stage-flags">
                ${isPerceived ? '<span class="flag flag--perceived">signal</span>' : ""}
                ${isActual ? '<span class="flag flag--actual">constraint</span>' : ""}
              </span>
            </div>
            <h3>${stage.label}</h3>
            <p>${stage.scarce}</p>
            <div class="queue-bar" aria-label="${stage.queue.toFixed(0)} items waiting">
              <span style="width: ${queueWidth}%"></span>
            </div>
            <dl class="stage-stats">
              <div><dt>Queue</dt><dd>${stage.queue.toFixed(0)}</dd></div>
              <div><dt>Effective cap.</dt><dd>${effectiveCapacity(stage).toFixed(1)}</dd></div>
              <div><dt>Coverage</dt><dd>${Math.round(stage.coverage * 100)}%</dd></div>
            </dl>
          </article>
          ${index < state.stages.length - 1 ? '<span class="pipeline-arrow" aria-hidden="true">→</span>' : ""}
        </li>
      `;
    }).join("");
  }

  function renderMetrics() {
    const last = state.history[state.history.length - 1];
    const wip = last
      ? last.averageWip
      : state.stages.reduce((sum, stage) => sum + stage.queue, 0);
    const oldest = last
      ? last.oldestAge
      : Math.max(...state.stages.map((stage) => stage.age));

    const metrics = [
      {
        label: "Accepted + owned / week",
        value: last ? last.outcomesPerWeek.toFixed(1) : state.baseline.toFixed(1),
        delta: last ? `${formatDelta(last.outcomeDelta)} from prior` : "scenario baseline",
        accent: true
      },
      {
        label: "Average WIP",
        value: wip.toFixed(0),
        delta: "items across the system"
      },
      {
        label: "Oldest work",
        value: `${oldest.toFixed(0)}w`,
        delta: "age of oldest queue"
      },
      {
        label: "Human attention / week",
        value: last ? `${last.humanAttention.toFixed(0)}h` : "—",
        delta: last ? "shaping, review, handoff" : "measured after cycle 1"
      }
    ];

    elements.metrics.innerHTML = metrics.map((metric) => `
      <div class="metric-card ${metric.accent ? "metric-card--accent" : ""}">
        <dt>${metric.label}</dt>
        <dd>${metric.value}</dd>
        <span>${metric.delta}</span>
      </div>
    `).join("");
  }

  function renderInvestments() {
    const spent = investmentCost([...selected]);
    elements.investments.innerHTML = INVESTMENTS.map((investment) => {
      const active = selected.has(investment.id);
      const cannotAfford = !active && spent + investment.cost > 10;
      const impact = difficulty === "easy" && !cannotAfford
        ? evaluateInvestmentImpact(state, [...selected], investment.id)
        : null;
      const impactClass = impact ? `is-impact-${impact.classification}` : "";
      const guidance = impact
        ? `<span class="guidance-cue guidance-cue--${impact.classification}">${guidanceText(impact)}</span>`
        : "";
      return `
        <button
          class="investment-card ${active ? "is-selected" : ""} ${impactClass}"
          type="button"
          data-investment="${investment.id}"
          aria-pressed="${active}"
          ${cannotAfford || state.cycle >= state.maxCycles ? "disabled" : ""}
        >
          <span class="investment-card__topline">
            <strong>${investment.label}</strong>
            <span>${investment.cost} pts</span>
          </span>
          ${guidance}
          <span class="investment-card__mechanism">${investment.mechanism}</span>
          <span class="investment-card__risk">Tradeoff · ${investment.sideEffect}</span>
        </button>
      `;
    }).join("");

    elements.investments.querySelectorAll("[data-investment]").forEach((button) => {
      button.addEventListener("click", () => {
        markSimulationStarted("investment");
        const id = button.dataset.investment;
        selected.has(id) ? selected.delete(id) : selected.add(id);
        clearNotice();
        renderStatus();
        renderInvestments();
        renderHint();
      });
    });
  }

  function guidanceText(impact) {
    const label = {
      helpful: "Helpful",
      harmful: "Harmful",
      learning: "Learning value",
      neutral: "Neutral"
    }[impact.classification];
    const context = impact.basis === "contribution" ? "selected effect" : "with this plan";
    if (impact.classification === "learning") {
      return `${label} · ${context}: stronger telemetry`;
    }
    if (impact.classification === "neutral") {
      return `${label} · ${context}: no material next-cycle change`;
    }
    if (Math.abs(impact.outcomeDelta) > 0.05) {
      return `${label} · ${context}: ${formatDelta(impact.outcomeDelta)} accepted / week`;
    }
    if (Math.abs(impact.wipDelta) > 0.5) {
      const direction = impact.wipDelta < 0 ? "less" : "more";
      return `${label} · ${context}: ${Math.abs(impact.wipDelta).toFixed(1)} ${direction} WIP`;
    }
    const direction = impact.attentionDelta < 0 ? "less" : "more";
    return `${label} · ${context}: ${Math.abs(impact.attentionDelta).toFixed(1)}h ${direction} human attention`;
  }

  function renderPrediction() {
    elements.prediction.innerHTML = STAGES.map((stage) => `
      <button
        type="button"
        class="prediction-chip"
        data-predict="${stage.id}"
        aria-pressed="${prediction === stage.id}"
        ${state.cycle >= state.maxCycles ? "disabled" : ""}
      >${stage.label}</button>
    `).join("");

    elements.prediction.querySelectorAll("[data-predict]").forEach((button) => {
      button.addEventListener("click", () => {
        markSimulationStarted("prediction");
        prediction = button.dataset.predict;
        clearNotice();
        renderPrediction();
      });
    });
  }

  function renderReceipt() {
    const receipt = state.receipts[state.receipts.length - 1];
    if (!receipt) {
      elements.receipt.hidden = true;
      return;
    }

    const selectedLabels = receipt.selectedIds.length
      ? receipt.selectedIds.map((id) => INVESTMENTS.find((investment) => investment.id === id)?.short).join(" + ")
      : "No intervention";

    elements.receipt.hidden = false;
    elements.receipt.innerHTML = `
      <div class="receipt__stamp">Learning receipt · cycle ${receipt.cycle}</div>
      <div class="receipt__grid">
        <div><span>Allocation</span><strong>${selectedLabels}</strong></div>
        <div><span>Your prediction</span><strong>${stageLabel(receipt.prediction)}</strong></div>
        <div><span>Model truth</span><strong>${stageLabel(receipt.actual)}</strong></div>
        <div><span>Accepted outcomes</span><strong>${receipt.metric.outcomesPerWeek.toFixed(1)} / week</strong></div>
      </div>
      <p class="receipt__result ${receipt.predictionCorrect ? "is-correct" : ""}">
        ${receipt.predictionCorrect ? "Prediction matched." : "Prediction missed."} ${receipt.message}
      </p>
      <p class="receipt__interpretation">${receiptInterpretation(receipt)}</p>
    `;
  }

  function receiptInterpretation(receipt) {
    if (receipt.selectedIds.includes("agents") && receipt.actual === "verify") {
      return "Build output increased, but verification remained the system limit. Additional production became review pressure and WIP.";
    }
    if (receipt.selectedIds.includes("foundation") && receipt.actual === "adopt") {
      return "The shared capability created migration inventory. Until consumers adopt it, shipped platform work is not leverage.";
    }
    if (receipt.selectedIds.includes("partners") && ["full-kit", "verify", "adopt"].includes(receipt.actual)) {
      return "External build capacity increased the internal demand for shaping, review, integration, and ownership.";
    }
    if (receipt.selectedIds.includes("observe")) {
      return "Instrumentation did not add physical capacity. It improved the odds that the next investment lands on the governing constraint.";
    }
    if (receipt.actualMoved) {
      return "The intervention changed the system. The previous playbook is now stale; diagnose again before investing the next cycle.";
    }
    return "Local activity changed, but the governing constraint did not. More output at a non-constraint cannot set whole-system throughput.";
  }

  function renderHistory() {
    if (!state.history.length) {
      elements.history.innerHTML = '<p class="empty-state">Run a cycle to build the evidence trail.</p>';
      return;
    }

    const maximum = Math.max(state.baseline, ...state.history.map((metric) => metric.outcomesPerWeek), 1);
    const rows = [
      { label: "Start", value: state.baseline, constraint: "unknown", confidence: state.receipts[0]?.confidence || state.diagnosis.confidence },
      ...state.history.map((metric) => ({
        label: `Cycle ${metric.cycle}`,
        value: metric.outcomesPerWeek,
        constraint: stageLabel(metric.actualConstraint),
        confidence: metric.confidence
      }))
    ];

    elements.history.innerHTML = rows.map((row) => `
      <div class="history-row">
        <span class="history-row__label">${row.label}</span>
        <div class="history-row__bar"><span style="width: ${Math.max(5, (row.value / maximum) * 100)}%"></span></div>
        <strong>${row.value.toFixed(1)}</strong>
        <span class="history-row__constraint">${row.constraint}</span>
      </div>
    `).join("");
  }

  function renderDebrief() {
    if (state.cycle < state.maxCycles) {
      elements.debrief.hidden = true;
      return;
    }

    const first = state.history[0];
    const last = state.history[state.history.length - 1];
    const path = state.history.map((metric) => stageLabel(metric.actualConstraint));
    const uniquePath = path.filter((label, index) => index === 0 || path[index - 1] !== label);
    const totalSpent = state.history.reduce((sum, metric) => sum + metric.investmentCost, 0);

    elements.debrief.hidden = false;
    elements.debrief.innerHTML = `
      <div class="debrief__header">
        <div>
          <p class="eyebrow">Four cycles later</p>
          <h2>The constraint was a moving target.</h2>
        </div>
        <span class="debrief__score">${last.outcomesPerWeek.toFixed(1)} <small>accepted / week</small></span>
      </div>
      <div class="debrief__path" aria-label="Constraint path">
        ${uniquePath.map((label, index) => `<span>${label}</span>${index < uniquePath.length - 1 ? "<b>→</b>" : ""}`).join("")}
      </div>
      <div class="debrief__facts">
        <div><span>Outcome change</span><strong>${formatDelta(last.outcomesPerWeek - state.baseline)} / week</strong></div>
        <div><span>Leverage spent</span><strong>${totalSpent} points</strong></div>
        <div><span>Final WIP</span><strong>${last.averageWip.toFixed(0)} items</strong></div>
        <div><span>Human attention</span><strong>${last.humanAttention.toFixed(0)}h / week</strong></div>
      </div>
      <p class="debrief__claim">The winning capability is not one permanent optimization. It is the ability to see the system, invest at the current constraint, measure accepted outcomes, and notice when the constraint moves.</p>
      <button class="button button--light" type="button" data-debrief-reset>Run another scenario</button>
    `;
    elements.debrief.querySelector("[data-debrief-reset]").addEventListener("click", () => resetScenario(state.scenarioId));
  }

  function showNotice(message) {
    elements.notice.textContent = message;
    elements.notice.hidden = false;
  }

  function clearNotice() {
    elements.notice.hidden = true;
    elements.notice.textContent = "";
  }

  function executeCycle() {
    if (!prediction) {
      showNotice("Choose your predicted constraint before running the cycle.");
      elements.prediction.querySelector("button")?.focus();
      return;
    }

    const scenarioId = state.scenarioId;
    const result = runCycle(state, [...selected], prediction);
    track("cycle_run", {
      scenario_id: scenarioId,
      cycle: result.receipt.cycle,
      investment_ids: result.receipt.selectedIds.join(",") || "none",
      prediction: result.receipt.prediction,
      modeled_constraint: result.receipt.actual,
      prediction_correct: result.receipt.predictionCorrect,
      accepted_per_week: Number(result.receipt.metric.outcomesPerWeek.toFixed(1)),
      guidance_mode: difficulty
    });
    state = result.state;
    selected = new Set();
    prediction = "";
    hintLevel = 0;
    clearNotice();
    render();
    if (state.cycle === state.maxCycles) {
      track("simulation_completed", {
        scenario_id: state.scenarioId,
        accepted_per_week: Number(result.receipt.metric.outcomesPerWeek.toFixed(1)),
        guidance_mode: difficulty
      });
    }
    elements.receipt.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetScenario(id) {
    state = createScenario(id);
    selected = new Set();
    prediction = "";
    hintLevel = 0;
    simulationStarted = false;
    clearNotice();
    render();
  }

  function render() {
    renderScenarioPicker();
    renderMode();
    renderStatus();
    renderDiagnosis();
    renderHint();
    renderPipeline();
    renderMetrics();
    renderInvestments();
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
  elements.hintButton.addEventListener("click", () => {
    markSimulationStarted("hint");
    hintLevel = Math.min(3, hintLevel + 1);
    track("hint_requested", {
      scenario_id: state.scenarioId,
      cycle: state.cycle,
      hint_level: hintLevel
    });
    renderHint();
  });
  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      difficulty = button.dataset.mode;
      track("guidance_mode_changed", { guidance_mode: difficulty });
      renderMode();
      renderInvestments();
    });
  });
  render();
}
