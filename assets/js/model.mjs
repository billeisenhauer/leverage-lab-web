export const STAGES = [
  { id: "shape", label: "Shape", scarce: "Product judgment" },
  { id: "full-kit", label: "Full Kit", scarce: "Authoritative context" },
  { id: "build", label: "Build", scarce: "Implementation capacity" },
  { id: "verify", label: "Verify", scarce: "Human judgment + tests" },
  { id: "release", label: "Integrate / Release", scarce: "Release confidence" },
  { id: "adopt", label: "Adopt / Own", scarce: "Migration + ownership" }
];

export const INVESTMENTS = [
  {
    id: "observe",
    label: "Instrument the handoffs",
    short: "Observe",
    cost: 3,
    mechanism: "Raise event coverage and diagnosis confidence without adding delivery capacity.",
    sideEffect: "Consumes capacity now; pays back through better intervention selection."
  },
  {
    id: "full-kit",
    label: "Improve context readiness",
    short: "Full Kit",
    cost: 4,
    mechanism: "Clarify interfaces, acceptance evidence, risk, and ownership before work starts.",
    sideEffect: "More shaping effort before implementation begins."
  },
  {
    id: "verification",
    label: "Automate verification",
    short: "Verify",
    cost: 5,
    mechanism: "Increase test coverage, reviewer signal quality, and verification capacity.",
    sideEffect: "Shared checks can initially expose more failures."
  },
  {
    id: "agents",
    label: "Increase agent concurrency",
    short: "Agents",
    cost: 4,
    mechanism: "Increase build capacity for work that agents can execute.",
    sideEffect: "Weak context increases rework and pressure on human reviewers."
  },
  {
    id: "foundation",
    label: "Build a shared foundation",
    short: "Foundation",
    cost: 5,
    mechanism: "Remove repeated implementation and integration work across consumers.",
    sideEffect: "Creates migration inventory when adoption is not funded."
  },
  {
    id: "adoption",
    label: "Fund adoption and migration",
    short: "Adoption",
    cost: 4,
    mechanism: "Increase consumer migration, documentation, and long-term ownership capacity.",
    sideEffect: "Temporarily redirects product-team attention."
  },
  {
    id: "partners",
    label: "Add partner capacity",
    short: "Partners",
    cost: 4,
    mechanism: "Add implementation capacity through an external delivery partner.",
    sideEffect: "Scoping, review, integration, and handoff consume internal capacity."
  },
  {
    id: "handoff",
    label: "Strengthen SOW + handoff",
    short: "Handoff",
    cost: 4,
    mechanism: "Name owners early and make acceptance, architecture, and transfer explicit.",
    sideEffect: "Adds work before partner implementation starts."
  },
  {
    id: "release-control",
    label: "Control release of work",
    short: "WIP control",
    cost: 2,
    mechanism: "Reduce concurrent initiatives and protect the constrained stage from overload.",
    sideEffect: "Fewer starts can feel slower before flow improves."
  },
  {
    id: "judgment",
    label: "Add scarce human judgment",
    short: "Judgment",
    cost: 4,
    mechanism: "Add experienced shaping and review capacity at high-consequence decisions.",
    sideEffect: "Expensive capacity that should not substitute for automation forever."
  }
];

const BASE_STAGES = {
  shape: { capacity: 13, yield: 0.95, attention: 1.35, coverage: 0.55, queue: 4 },
  "full-kit": { capacity: 12, yield: 0.87, attention: 1.15, coverage: 0.42, queue: 6 },
  build: { capacity: 24, yield: 0.80, attention: 0.65, coverage: 0.95, queue: 17 },
  verify: { capacity: 7, yield: 0.82, attention: 1.60, coverage: 0.32, queue: 14 },
  release: { capacity: 11, yield: 0.96, attention: 0.75, coverage: 0.58, queue: 5 },
  adopt: { capacity: 8, yield: 0.82, attention: 1.30, coverage: 0.40, queue: 10 }
};

export const SCENARIOS = [
  {
    id: "agent-wave",
    name: "The agent output wave",
    prompt: "Build capacity nearly doubled. Accepted outcomes did not.",
    seed: 4217,
    demand: 8,
    variance: 1.4,
    baseline: 5.5,
    overrides: {}
  },
  {
    id: "foundation-adoption",
    name: "The beautiful foundation",
    prompt: "The shared capability shipped. Consumer behavior did not change.",
    seed: 7129,
    demand: 7,
    variance: 1.1,
    baseline: 3.6,
    overrides: {
      build: { capacity: 18, queue: 8, coverage: 0.88 },
      verify: { capacity: 9, queue: 8, coverage: 0.58 },
      adopt: { capacity: 5, yield: 0.75, queue: 19, coverage: 0.28 }
    }
  },
  {
    id: "partner-surge",
    name: "The partner capacity surge",
    prompt: "More builders arrived before the work and ownership model were ready.",
    seed: 9833,
    demand: 8,
    variance: 1.5,
    baseline: 4.4,
    overrides: {
      "full-kit": { capacity: 6, yield: 0.78, queue: 15, coverage: 0.30 },
      build: { capacity: 25, yield: 0.75, queue: 20, coverage: 0.92 },
      verify: { capacity: 8, yield: 0.80, queue: 13, coverage: 0.45 },
      adopt: { capacity: 7, yield: 0.78, queue: 12, coverage: 0.35 }
    }
  },
  {
    id: "dark-system",
    name: "The dark system",
    prompt: "Every team has a bottleneck story. The evidence cannot distinguish among them.",
    seed: 11351,
    demand: 7.5,
    variance: 1.8,
    baseline: 5.2,
    overrides: {
      shape: { coverage: 0.22 },
      "full-kit": { coverage: 0.18 },
      build: { coverage: 0.62 },
      verify: { coverage: 0.18 },
      release: { coverage: 0.20 },
      adopt: { coverage: 0.14 }
    }
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stageIndex(id) {
  return STAGES.findIndex((stage) => stage.id === id);
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function mergeStage(id, overrides = {}) {
  const stageMeta = STAGES.find((stage) => stage.id === id);
  return {
    ...stageMeta,
    ...BASE_STAGES[id],
    ...overrides,
    age: Math.max(1, Math.round((overrides.queue ?? BASE_STAGES[id].queue) / 2)),
    utilization: 0,
    failures: 0,
    processed: 0
  };
}

export function createScenario(scenarioId = "agent-wave") {
  const scenario = SCENARIOS.find((candidate) => candidate.id === scenarioId) || SCENARIOS[0];
  const stages = STAGES.map(({ id }) => mergeStage(id, scenario.overrides[id]));

  const state = {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    prompt: scenario.prompt,
    seed: scenario.seed,
    demand: scenario.demand,
    variance: scenario.variance,
    baseline: scenario.baseline,
    cycle: 0,
    maxCycles: 4,
    stages,
    history: [],
    receipts: [],
    totalAccepted: 0,
    selectedInvestments: []
  };

  state.diagnosis = diagnose(state);
  return state;
}

export function effectiveCapacity(stage) {
  return stage.capacity * stage.yield;
}

export function diagnose(state) {
  const actualRanking = state.stages
    .map((stage) => ({ id: stage.id, score: effectiveCapacity(stage) }))
    .sort((a, b) => a.score - b.score);

  const maxCapacity = Math.max(...state.stages.map((stage) => stage.capacity));
  const random = seededRandom(state.seed + state.cycle * 137);
  const perceivedRanking = state.stages
    .map((stage) => {
      const queuePressure = Math.min(2, stage.queue / Math.max(1, stage.capacity));
      const activity = stage.capacity / maxCapacity;
      const qualityLoss = 1 - stage.yield;
      const observed = queuePressure * 0.55 + activity * 0.25 + qualityLoss * 0.20;
      // Missing telemetry should blur the signal, not overwhelm every
      // observed pattern. Keep the bounded noise below the contribution of a
      // well-instrumented, visibly active stage.
      const noise = 0.08 + random() * 0.17;
      return {
        id: stage.id,
        score: observed * stage.coverage + noise * (1 - stage.coverage),
        coverage: stage.coverage
      };
    })
    .sort((a, b) => b.score - a.score);

  const leader = perceivedRanking[0];
  const runnerUp = perceivedRanking[1];
  const margin = clamp((leader.score - runnerUp.score) / Math.max(0.01, leader.score), 0, 1);
  const confidence = Math.round(clamp(leader.coverage * 0.68 + margin * 0.32, 0.18, 0.96) * 100);

  return {
    actual: actualRanking[0].id,
    actualEffectiveCapacity: actualRanking[0].score,
    perceived: leader.id,
    confidence,
    missingEvidence: state.stages
      .filter((stage) => stage.coverage < 0.5)
      .sort((a, b) => a.coverage - b.coverage)
      .slice(0, 2)
      .map((stage) => stage.id)
  };
}

export function investmentCost(ids) {
  return ids.reduce((total, id) => {
    const investment = INVESTMENTS.find((candidate) => candidate.id === id);
    return total + (investment ? investment.cost : 0);
  }, 0);
}

function modifyStage(state, id, changes) {
  const stage = state.stages[stageIndex(id)];
  Object.entries(changes).forEach(([key, amount]) => {
    stage[key] += amount;
  });
}

function applyInvestment(state, id) {
  switch (id) {
    case "observe":
      state.stages.forEach((stage) => {
        stage.coverage = clamp(stage.coverage + 0.15, 0, 0.98);
      });
      modifyStage(state, "verify", { coverage: 0.18 });
      modifyStage(state, "adopt", { coverage: 0.18 });
      break;
    case "full-kit":
      modifyStage(state, "full-kit", { capacity: 1.5, yield: 0.06, attention: -0.08 });
      modifyStage(state, "build", { yield: 0.04 });
      modifyStage(state, "verify", { yield: 0.02 });
      break;
    case "verification":
      modifyStage(state, "verify", { capacity: 3, yield: 0.06, attention: -0.16, coverage: 0.15 });
      break;
    case "agents": {
      const fullKit = state.stages[stageIndex("full-kit")];
      modifyStage(state, "build", { capacity: 7, yield: fullKit.yield < 0.9 ? -0.06 : -0.02, attention: -0.12 });
      modifyStage(state, "verify", { attention: 0.10 });
      break;
    }
    case "foundation":
      modifyStage(state, "build", { capacity: 2, yield: 0.02 });
      modifyStage(state, "release", { capacity: 2, yield: 0.02 });
      modifyStage(state, "adopt", { queue: 3, attention: 0.08 });
      break;
    case "adoption":
      modifyStage(state, "adopt", { capacity: 3, yield: 0.08, attention: -0.10, coverage: 0.10 });
      break;
    case "partners": {
      const ready = state.stages[stageIndex("full-kit")].yield >= 0.9;
      modifyStage(state, "build", { capacity: 6, yield: ready ? -0.01 : -0.05 });
      modifyStage(state, "full-kit", { capacity: ready ? -0.25 : -1 });
      modifyStage(state, "verify", { capacity: ready ? -0.25 : -1, yield: ready ? 0 : -0.03 });
      modifyStage(state, "adopt", { capacity: ready ? -0.25 : -0.75, attention: 0.14 });
      break;
    }
    case "handoff":
      modifyStage(state, "full-kit", { yield: 0.05, coverage: 0.08 });
      modifyStage(state, "adopt", { capacity: 2, yield: 0.05, coverage: 0.10 });
      break;
    case "release-control":
      state.demand = Math.max(2, state.demand - 1.5);
      modifyStage(state, "full-kit", { yield: 0.02 });
      modifyStage(state, "verify", { yield: 0.02 });
      modifyStage(state, "adopt", { yield: 0.02 });
      break;
    case "judgment":
      modifyStage(state, "shape", { capacity: 1 });
      modifyStage(state, "verify", { capacity: 2, yield: 0.02 });
      break;
    default:
      break;
  }

  state.stages.forEach((stage) => {
    stage.capacity = Math.max(1, stage.capacity);
    stage.yield = clamp(stage.yield, 0.55, 0.99);
    stage.attention = Math.max(0.18, stage.attention);
    stage.coverage = clamp(stage.coverage, 0.08, 0.98);
    stage.queue = Math.max(0, stage.queue);
  });
}

function passCount(processed, yieldRate, random) {
  let passed = 0;
  for (let item = 0; item < processed; item += 1) {
    if (random() <= yieldRate) passed += 1;
  }
  return passed;
}

export function runCycle(originalState, selectedIds = [], predictedConstraint = "") {
  if (originalState.cycle >= originalState.maxCycles) {
    throw new Error("The scenario is complete.");
  }

  if (investmentCost(selectedIds) > 10) {
    throw new Error("Investment exceeds the ten-point cycle budget.");
  }

  const state = clone(originalState);
  const before = diagnose(state);
  selectedIds.forEach((id) => applyInvestment(state, id));

  const random = seededRandom(state.seed + (state.cycle + 1) * 1009);
  let accepted = 0;
  let attention = 0;
  let failures = 0;
  let escapedDefects = 0;
  let totalWip = 0;
  const utilizationTotals = state.stages.map(() => 0);
  const processedTotals = state.stages.map(() => 0);
  const failureTotals = state.stages.map(() => 0);

  for (let week = 0; week < 6; week += 1) {
    const arrivals = Math.max(0, Math.round(state.demand + (random() - 0.5) * state.variance * 2));
    state.stages[0].queue += arrivals;

    const startingQueues = state.stages.map((stage) => stage.queue);
    const nextQueues = [...startingQueues];

    state.stages.forEach((stage, index) => {
      const available = Math.max(1, Math.floor(stage.capacity * (0.91 + random() * 0.18)));
      const processed = Math.min(startingQueues[index], available);
      const passed = passCount(processed, stage.yield, random);
      const failed = processed - passed;

      nextQueues[index] -= passed;
      processedTotals[index] += processed;
      failureTotals[index] += failed;
      failures += failed;
      attention += processed * stage.attention + failed * 0.25;
      utilizationTotals[index] += processed / Math.max(1, stage.capacity);

      if (index === state.stages.length - 1) {
        accepted += passed;
        escapedDefects += passed * (1 - stage.yield) * 0.12;
      } else {
        nextQueues[index + 1] += passed;
      }
    });

    state.stages.forEach((stage, index) => {
      stage.queue = Math.max(0, nextQueues[index]);
      stage.age = stage.queue > 0 ? (startingQueues[index] > 0 ? stage.age + 1 : 1) : 0;
    });

    totalWip += state.stages.reduce((sum, stage) => sum + stage.queue, 0);
  }

  state.stages.forEach((stage, index) => {
    stage.utilization = utilizationTotals[index] / 6;
    stage.processed = processedTotals[index];
    stage.failures = failureTotals[index];
  });

  state.cycle += 1;
  state.totalAccepted += accepted;
  state.selectedInvestments = [...selectedIds];
  state.diagnosis = diagnose(state);

  const outcomesPerWeek = accepted / 6;
  const comparison = state.history.length > 0
    ? state.history[state.history.length - 1].outcomesPerWeek
    : state.baseline;
  const metric = {
    cycle: state.cycle,
    outcomesPerWeek,
    outcomeDelta: outcomesPerWeek - comparison,
    averageWip: totalWip / 6,
    oldestAge: Math.max(...state.stages.map((stage) => stage.age)),
    humanAttention: attention / 6,
    failures,
    escapedDefects,
    actualConstraint: state.diagnosis.actual,
    perceivedConstraint: state.diagnosis.perceived,
    confidence: state.diagnosis.confidence,
    investmentCost: investmentCost(selectedIds)
  };

  const actualMoved = before.actual !== state.diagnosis.actual;
  const receipt = {
    cycle: state.cycle,
    prediction: predictedConstraint,
    predictionCorrect: predictedConstraint === state.diagnosis.actual,
    beforeActual: before.actual,
    actual: state.diagnosis.actual,
    perceived: state.diagnosis.perceived,
    confidence: state.diagnosis.confidence,
    actualMoved,
    selectedIds: [...selectedIds],
    metric,
    message: actualMoved
      ? `The governing constraint moved from ${stageLabel(before.actual)} to ${stageLabel(state.diagnosis.actual)}.`
      : `The governing constraint remains ${stageLabel(state.diagnosis.actual)}.`
  };

  state.history.push(metric);
  state.receipts.push(receipt);
  return { state, receipt };
}

export function stageLabel(id) {
  return STAGES.find((stage) => stage.id === id)?.label || id;
}

export function formatDelta(value, digits = 1) {
  const rounded = value.toFixed(digits);
  return `${value > 0 ? "+" : ""}${rounded}`;
}
