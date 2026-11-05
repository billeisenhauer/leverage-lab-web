// Factory Lab: a companion to the Leverage Lab model.
//
// Leverage Lab asks where the constraint is. Factory Lab zooms into its Build
// and Verify stages and asks a different question: which kinds of change can
// merge without a person reading them, and when would you find out you were
// wrong? Defects that escape surface weeks later, so a dark room can look
// excellent for a whole cycle before the bill arrives.
//
// Like model.mjs, everything here is deterministic for a seed, and the
// constants teach relationships. They are not benchmarks.

export const CYCLE_WEEKS = 6;
export const MAX_CYCLES = 4;
export const CYCLE_BUDGET = 8;
// An incident this size is the kind a customer remembers: wrong charges,
// exposed accounts, a compromised release.
export const SEVERE_HARM = 15;

// Kinds of defect, how long each takes to show up in production, and how
// likely each check is to catch it. Error tracking is blind to silent data
// errors, which is why they take longest to surface.
export const KINDS = {
  logic: { label: "Logic error", delay: [1, 3] },
  contract: { label: "Misread requirement", delay: [2, 6] },
  silent: { label: "Silent data error", delay: [5, 10] },
  security: { label: "Security hole", delay: [6, 14] },
  supply: { label: "Compromised package", delay: [3, 8] }
};

const KIND_IDS = Object.keys(KINDS);

// Continuous integration on every change, before any added check.
const BASE_CATCH = { logic: 0.35, contract: 0.05, silent: 0, security: 0.1, supply: 0.05 };

// A person reading the change, after the automated checks have run.
const HUMAN_CATCH = { logic: 0.6, contract: 0.55, silent: 0.2, security: 0.35, supply: 0.25 };

export const ROOMS = [
  {
    id: "docs", label: "Docs and copy", volume: 8, defectRate: 0.05, consequence: 0.3,
    value: 0.3, reviewMinutes: 4, debt: 0, mix: { logic: 1 }
  },
  {
    id: "deps", label: "Dependency bumps", volume: 8, defectRate: 0.03, consequence: 1,
    value: 0.5, reviewMinutes: 6, debt: 0, mix: { logic: 0.75, supply: 0.25 },
    // Some bumps touch packages that sign-in or payments run on. They look
    // like chores and carry the consequence of the room they serve.
    critical: { share: 0.2, consequence: 8, mix: { logic: 0.5, security: 0.5 } }
  },
  {
    id: "tools", label: "Internal tools", volume: 8, defectRate: 0.12, consequence: 0.8,
    value: 1, reviewMinutes: 15, debt: 0.5, mix: { logic: 0.7, contract: 0.3 }
  },
  {
    id: "features", label: "Product features", volume: 10, defectRate: 0.2, consequence: 2.5,
    value: 2, reviewMinutes: 35, debt: 1, mix: { logic: 0.45, contract: 0.55 }
  },
  {
    id: "auth", label: "Sign-in and permissions", volume: 3, defectRate: 0.15, consequence: 10,
    value: 1.5, reviewMinutes: 45, debt: 1, mix: { logic: 0.4, contract: 0.45, security: 0.15 }
  },
  {
    id: "billing", label: "Billing and payments", volume: 3, defectRate: 0.15, consequence: 12,
    value: 1.5, reviewMinutes: 45, debt: 1, mix: { logic: 0.35, contract: 0.25, silent: 0.4 }
  }
];

export const CARDS = [
  {
    id: "proof", label: "Prove tests fail first", short: "Proof", cost: 3,
    catch: { logic: 0.5 },
    mechanism: "Every new test must fail on the old code and pass on the new, so tests can't pass by testing nothing.",
    sideEffect: "Catches logic errors; does nothing for a misread requirement the test faithfully encodes."
  },
  {
    id: "review", label: "Second-maker review", short: "Review", cost: 3,
    catch: { contract: 0.4, logic: 0.15, security: 0.15 },
    mechanism: "A model from a different maker describes the change cold, and a mismatch with the request stops it.",
    sideEffect: "Shares fewer blind spots with the author, but still only reads the diff."
  },
  {
    id: "holdout", label: "Holdout scenarios", short: "Holdout", cost: 4,
    catch: { contract: 0.45, logic: 0.1 },
    mechanism: "Acceptance scenarios the building agent can neither see nor edit.",
    sideEffect: "Costs effort to write and keep current; covers only what you thought to write down."
  },
  {
    id: "reconcile", label: "Reconcile with the provider", short: "Reconcile", cost: 3,
    catch: { silent: 0.85 },
    mechanism: "Compare your totals with the payment provider's own records every day.",
    sideEffect: "Only sees money. Error tracking stays blind to silent data errors everywhere else."
  },
  {
    id: "cooldown", label: "Release cooldown and pinning", short: "Cooldown", cost: 2,
    catch: { supply: 0.85 },
    mechanism: "Don't take a package version until it has been public for days; pin build tools by hash.",
    sideEffect: "Urgent security patches need a deliberate bypass."
  },
  {
    id: "canary", label: "Staging and canary", short: "Canary", cost: 4,
    mechanism: "Changes reach a small slice of traffic first, so escapes surface sooner and hurt fewer people.",
    sideEffect: "Catches nothing before merge. It shrinks the damage and the delay."
  },
  {
    id: "slips", label: "Decidable-cold slips", short: "Slips", cost: 3,
    mechanism: "Every question for you states the decision, options, a recommendation and what happens if nobody answers.",
    sideEffect: "Review gets faster, not more careful."
  },
  {
    id: "split", label: "Split critical packages out", short: "Split", cost: 1,
    mechanism: "Bumps to packages that sign-in or payments depend on leave the bump room and come to you.",
    sideEffect: "A few more reviews each week."
  },
  {
    id: "wip", label: "Cap open changes", short: "WIP cap", cost: 2,
    mechanism: "The factory stops starting work in lit rooms while a week of review is already waiting for you.",
    sideEffect: "Less gets built. Nothing waits for weeks, and you stop skimming."
  },
  {
    id: "measure", label: "Measure the checks", short: "Measure", cost: 2, repeatable: true,
    mechanism: "Replay known past defects through the checks and count what they would have caught.",
    sideEffect: "Adds no protection. The result goes stale when the checks change."
  },
  {
    id: "drill", label: "Rebuild drill", short: "Drill", cost: 2, repeatable: true,
    mechanism: "Rebuild one component from its spec and tests, and write down every place the agent had to guess.",
    sideEffect: "Pays down unread code; must be repeated as dark merges add more."
  }
];

export const SCENARIOS = [
  {
    id: "factory-lights-out",
    name: "Lights out",
    prompt: "Every change merges on green. The first six weeks look wonderful.",
    seed: 2207,
    ownerHours: 12,
    dark: ["docs", "deps", "tools", "features", "auth", "billing"],
    owned: [],
    // Going lights out means nothing turns the lights back on.
    lapseOnEscape: false
  },
  {
    id: "factory-lockdown",
    name: "Lockdown",
    prompt: "You read every change. Nothing breaks, and the queue never empties.",
    seed: 3301,
    ownerHours: 12,
    dark: [],
    owned: []
  },
  {
    id: "factory-silent-charge",
    name: "The silent charge",
    prompt: "Error tracking is quiet and every check is green. Some customers are being charged twice.",
    seed: 5113,
    ownerHours: 12,
    dark: ["docs", "deps", "tools", "billing"],
    owned: ["proof"],
    rooms: { billing: { volume: 4, mix: { logic: 0.2, contract: 0.2, silent: 0.6 } } }
  },
  {
    id: "factory-quiet-bump",
    name: "The quiet bump",
    prompt: "Patch bumps merge on their own. One of next month's patches isn't what it says it is.",
    seed: 7417,
    ownerHours: 12,
    dark: ["docs", "deps"],
    owned: ["proof", "review"],
    // Bumps to the packages sign-in and payments run on break more often
    // than ordinary ones, because those packages change more between patches.
    rooms: { deps: { critical: { share: 0.25, consequence: 8, defectRate: 0.12, mix: { logic: 0.5, security: 0.5 } } } },
    // A compromised release of an ordinary package arrives in week 8.
    poison: { week: 8, consequence: 20, delay: 3 }
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// The same generator as model.mjs, so a seed means the same thing in both labs.
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

function pick(mix, random) {
  const roll = random();
  let total = 0;
  const entries = Object.entries(mix);
  for (const [kind, share] of entries) {
    total += share;
    if (roll <= total) return kind;
  }
  return entries[entries.length - 1][0];
}

function between([low, high], random) {
  return low + Math.floor(random() * (high - low + 1));
}

export function cardById(id) {
  return CARDS.find((card) => card.id === id);
}

export function roomById(id) {
  return ROOMS.find((room) => room.id === id);
}

export function roomLabel(id) {
  return roomById(id)?.label || "No incident";
}

export function createScenario(scenarioId = "factory-lights-out", { salt = 0 } = {}) {
  const scenario = SCENARIOS.find((candidate) => candidate.id === scenarioId) || SCENARIOS[0];
  const rooms = ROOMS.map((room) => ({
    ...clone(room),
    ...clone(scenario.rooms?.[room.id] || {}),
    mode: scenario.dark.includes(room.id) ? "dark" : "lit",
    unread: 0
  }));

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    prompt: scenario.prompt,
    seed: scenario.seed,
    salt,
    poison: scenario.poison ? clone(scenario.poison) : null,
    ownerMinutes: scenario.ownerHours * 60,
    lapseOnEscape: scenario.lapseOnEscape ?? true,
    week: 0,
    cycle: 0,
    maxCycles: MAX_CYCLES,
    rooms,
    owned: [...scenario.owned],
    queue: [],
    latent: [],
    incidentMinutesDue: 0,
    measured: null,
    lapses: [],
    harmByRoom: {},
    harmByKind: {},
    plans: [],
    history: [],
    receipts: [],
    totals: emptyTotals()
  };
}

function emptyTotals() {
  return {
    value: 0, merged: 0, caught: 0, escaped: 0, surfaced: 0,
    harmCommitted: 0, harmSurfaced: 0, severe: 0,
    reviewMinutes: 0, incidentMinutes: 0, glanceMinutes: 0,
    waitWeeks: 0, waited: 0, litMerged: 0, held: 0
  };
}

// The automated checks' catch rate for one kind of defect.
export function ladderCatch(owned, kind) {
  const miss = CARDS
    .filter((card) => owned.includes(card.id) && card.catch?.[kind])
    .reduce((product, card) => product * (1 - card.catch[kind]), 1 - BASE_CATCH[kind]);
  return 1 - miss;
}

export function ladderRates(owned) {
  return Object.fromEntries(KIND_IDS.map((kind) => [kind, ladderCatch(owned, kind)]));
}

function ladderKey(owned) {
  return CARDS.filter((card) => card.catch && owned.includes(card.id)).map((card) => card.id).join("+");
}

export function measurementIsStale(state) {
  return Boolean(state.measured) && state.measured.key !== ladderKey(state.owned);
}

export function planCost(plan) {
  return (plan.buy || []).reduce((total, id) => total + (cardById(id)?.cost || 0), 0);
}

// Unread code: every dark merge in a room adds to what nobody has read
// there. It raises that room's defect rate and makes its incidents worse.
function debtFactor(room) {
  return 1 + Math.min(1, room.unread / 120);
}

function severityFactor(room) {
  return 1 + Math.min(0.5, room.unread / 240);
}

function totalUnread(state) {
  return state.rooms.reduce((sum, room) => sum + room.unread, 0);
}

function applyPlan(state, plan) {
  const buy = plan.buy || [];
  buy.forEach((id) => {
    const card = cardById(id);
    if (!card) throw new Error(`Unknown card: ${id}`);
    if (!card.repeatable && state.owned.includes(id)) throw new Error(`${card.label} is already in place.`);
  });
  if (planCost(plan) > CYCLE_BUDGET) {
    throw new Error(`The plan exceeds the ${CYCLE_BUDGET}-point cycle budget.`);
  }

  buy.forEach((id) => {
    const card = cardById(id);
    if (!card.repeatable) state.owned.push(id);
  });
  if (buy.includes("drill")) state.rooms.forEach((room) => { room.unread *= 0.6; });
  if (buy.includes("measure")) {
    state.measured = { key: ladderKey(state.owned), rates: ladderRates(state.owned), cycle: state.cycle + 1 };
  }

  Object.entries(plan.rooms || {}).forEach(([id, mode]) => {
    const room = state.rooms.find((candidate) => candidate.id === id);
    if (room && (mode === "lit" || mode === "dark")) room.mode = mode;
  });
  if (typeof plan.lapseOnEscape === "boolean") state.lapseOnEscape = plan.lapseOnEscape;
}

// Every change gets its own random draws, fixed by the seed, the week, the
// room and its place in line. A decision then changes only what it touches:
// buying a check can catch more defects, but it can't reshuffle which changes
// were defective in the first place.
function stream(state, ...keys) {
  let hash = (state.seed + state.salt * 7919) >>> 0;
  keys.forEach((key) => {
    hash = (Math.imul(hash ^ key, 0x9e3779b1) + 0x7f4a7c15) >>> 0;
  });
  return seededRandom(hash);
}

function newChange(state, room, random) {
  const critical = Boolean(room.critical) && random() < room.critical.share;
  const defectRoll = random();
  const kindRoll = random();
  const rolls = { check: random(), human: random(), delay: random() };
  const defectRate = critical ? room.critical.defectRate ?? room.defectRate : room.defectRate;
  const defective = defectRoll < Math.min(0.9, defectRate * debtFactor(room));
  const kind = defective ? pick(critical ? room.critical.mix : room.mix, () => kindRoll) : null;
  return {
    room: room.id,
    week: state.week,
    critical,
    consequence: critical ? room.critical.consequence : room.consequence,
    kind,
    poison: false,
    rolls
  };
}

function escape(state, change, cycleStats, dark) {
  const canary = state.owned.includes("canary");
  const room = state.rooms.find((candidate) => candidate.id === change.room);
  const delay = change.poison ? state.poison.delay : between(KINDS[change.kind].delay, () => change.rolls.delay);
  const harm = change.consequence
    * (canary ? 0.5 : 1)
    * severityFactor(room);
  state.latent.push({
    room: change.room,
    kind: change.kind,
    surfaceWeek: state.week + Math.max(1, canary ? Math.ceil(delay / 2) : delay),
    harm,
    dark,
    poison: change.poison
  });
  cycleStats.escaped += 1;
  cycleStats.harmCommitted += harm;
  state.harmByRoom[change.room] = (state.harmByRoom[change.room] || 0) + harm;
  state.harmByKind[change.kind] = (state.harmByKind[change.kind] || 0) + harm;
}

function checksCatch(state, change) {
  if (!change.kind) return false;
  // A cooldown outlasts a compromised release: it is pulled before it is old
  // enough to install.
  if (change.poison) return state.owned.includes("cooldown") || change.rolls.check < BASE_CATCH.supply;
  return change.rolls.check < ladderCatch(state.owned, change.kind);
}

function merge(state, change, cycleStats) {
  const room = state.rooms.find((candidate) => candidate.id === change.room);
  cycleStats.merged += 1;
  cycleStats.value += room.value;
}

function reviewMinutesFor(state, change) {
  return roomById(change.room).reviewMinutes * (state.owned.includes("slips") ? 0.7 : 1);
}

function queuedMinutes(state) {
  return state.queue.reduce((sum, change) => sum + reviewMinutesFor(state, change), 0);
}

function runWeek(state, cycleStats) {
  const reviewBudget = Math.max(120, state.ownerMinutes - state.incidentMinutesDue);
  cycleStats.incidentMinutes += state.incidentMinutesDue;
  state.incidentMinutesDue = 0;

  // Arrivals. Dark rooms merge on green; lit rooms wait for you.
  state.rooms.forEach((room, roomIndex) => {
    const spread = room.volume * 0.3;
    const roll = stream(state, state.week, roomIndex, 0)();
    const arrivals = Math.max(0, Math.round(room.volume + (roll - 0.5) * 2 * spread));
    for (let index = 0; index < arrivals; index += 1) {
      const change = newChange(state, room, stream(state, state.week, roomIndex, index + 1));
      const toYou = room.mode === "lit" || (change.critical && state.owned.includes("split"));
      if (toYou) {
        if (state.owned.includes("wip") && queuedMinutes(state) >= state.ownerMinutes) {
          cycleStats.held += 1;
          continue;
        }
        state.queue.push(change);
        continue;
      }
      cycleStats.glanceMinutes += 1;
      if (checksCatch(state, change)) {
        cycleStats.caught += 1;
      } else if (change.kind) {
        escape(state, change, cycleStats, true);
      }
      merge(state, change, cycleStats);
      room.unread += room.debt;
    }
  });

  if (state.poison && state.week === state.poison.week) {
    const deps = state.rooms.find((room) => room.id === "deps");
    const change = {
      room: "deps", week: state.week, critical: false,
      consequence: state.poison.consequence, kind: "supply", poison: true,
      rolls: { check: stream(state, state.week, 99, 0)(), human: stream(state, state.week, 99, 1)(), delay: 0 }
    };
    if (deps.mode === "lit") {
      state.queue.push(change);
    } else if (checksCatch(state, change)) {
      cycleStats.caught += 1;
      cycleStats.poisonStopped = true;
    } else {
      escape(state, change, cycleStats, true);
      merge(state, change, cycleStats);
    }
  }

  // Review, oldest first. A long queue makes you skim.
  const load = queuedMinutes(state) / reviewBudget;
  const attention = load > 1 ? Math.max(0.5, 1 - 0.12 * (load - 1)) : 1;
  cycleStats.peakLoad = Math.max(cycleStats.peakLoad, load);

  let minutes = reviewBudget;
  while (state.queue.length && minutes >= reviewMinutesFor(state, state.queue[0])) {
    const change = state.queue.shift();
    minutes -= reviewMinutesFor(state, change);
    cycleStats.reviewMinutes += reviewMinutesFor(state, change);
    cycleStats.waitWeeks += state.week - change.week;
    cycleStats.waited += 1;
    if (checksCatch(state, change)) {
      cycleStats.caught += 1;
      if (change.poison) cycleStats.poisonStopped = true;
    } else if (change.kind) {
      if (change.rolls.human < HUMAN_CATCH[change.kind] * attention) {
        cycleStats.caught += 1;
        if (change.poison) cycleStats.poisonStopped = true;
      } else {
        escape(state, change, cycleStats, false);
      }
    }
    merge(state, change, cycleStats);
    cycleStats.litMerged += 1;
  }

  // Escapes from earlier weeks reach customers now.
  const due = state.latent.filter((defect) => defect.surfaceWeek <= state.week);
  state.latent = state.latent.filter((defect) => defect.surfaceWeek > state.week);
  due.forEach((defect) => {
    cycleStats.surfaced += 1;
    cycleStats.harmSurfaced += defect.harm;
    if (defect.harm >= SEVERE_HARM) cycleStats.severe += 1;
    cycleStats.incidents.push(defect);
    state.incidentMinutesDue += Math.min(600, defect.harm * 72);
    const room = state.rooms.find((candidate) => candidate.id === defect.room);
    if (state.lapseOnEscape && defect.dark && room.mode === "dark") {
      room.mode = "lit";
      state.lapses.push({ room: room.id, week: state.week, cycle: state.cycle + 1 });
      cycleStats.lapsed.push(room.id);
    }
  });

  state.week += 1;
}

export function runCycle(originalState, plan = {}, prediction = "") {
  if (originalState.cycle >= originalState.maxCycles) {
    throw new Error("The scenario is complete.");
  }

  const state = clone(originalState);
  const before = { rooms: Object.fromEntries(state.rooms.map((room) => [room.id, room.mode])) };
  applyPlan(state, plan);
  state.plans.push(clone({ ...plan, rooms: Object.fromEntries(state.rooms.map((room) => [room.id, room.mode])) }));

  const cycleStats = {
    ...emptyTotals(),
    incidents: [],
    lapsed: [],
    peakLoad: 0,
    poisonStopped: false
  };

  for (let week = 0; week < CYCLE_WEEKS; week += 1) {
    runWeek(state, cycleStats);
  }

  state.cycle += 1;
  Object.keys(state.totals).forEach((key) => {
    state.totals[key] += cycleStats[key] || 0;
  });

  const ownerMinutes = cycleStats.reviewMinutes + cycleStats.incidentMinutes + cycleStats.glanceMinutes;
  const costliest = cycleStats.incidents.reduce(
    (worst, defect) => (!worst || defect.harm > worst.harm ? defect : worst),
    null
  );
  const metric = {
    cycle: state.cycle,
    valuePerWeek: cycleStats.value / CYCLE_WEEKS,
    mergedPerWeek: cycleStats.merged / CYCLE_WEEKS,
    ownerHoursPerWeek: ownerMinutes / 60 / CYCLE_WEEKS,
    reviewHoursPerWeek: cycleStats.reviewMinutes / 60 / CYCLE_WEEKS,
    incidentHoursPerWeek: cycleStats.incidentMinutes / 60 / CYCLE_WEEKS,
    averageWaitWeeks: cycleStats.waited ? cycleStats.waitWeeks / cycleStats.waited : 0,
    queueAtEnd: state.queue.length,
    heldPerWeek: cycleStats.held / CYCLE_WEEKS,
    peakLoad: cycleStats.peakLoad,
    caught: cycleStats.caught,
    escaped: cycleStats.escaped,
    surfaced: cycleStats.surfaced,
    harmSurfaced: cycleStats.harmSurfaced,
    harmCommitted: cycleStats.harmCommitted,
    severe: cycleStats.severe,
    latentCount: state.latent.length,
    latentHarm: state.latent.reduce((sum, defect) => sum + defect.harm, 0),
    unread: totalUnread(state),
    observedCatchRate: observedCatchRate(state),
    trueCatchRate: trueCatchRate(state),
    cost: planCost(plan)
  };

  const receipt = {
    cycle: state.cycle,
    prediction,
    actual: costliest ? costliest.room : "none",
    predictionCorrect: prediction === (costliest ? costliest.room : "none"),
    costliest: costliest ? { room: costliest.room, kind: costliest.kind, harm: costliest.harm, poison: costliest.poison } : null,
    incidentsByRoom: groupIncidents(cycleStats.incidents),
    lapsed: cycleStats.lapsed,
    poisonStopped: cycleStats.poisonStopped,
    bought: [...(plan.buy || [])],
    roomsBefore: before.rooms,
    roomsAfter: Object.fromEntries(state.rooms.map((room) => [room.id, room.mode])),
    metric
  };

  state.history.push(metric);
  state.receipts.push(receipt);
  return { state, receipt };
}

function groupIncidents(incidents) {
  return incidents.reduce((groups, defect) => {
    groups[defect.room] = (groups[defect.room] || 0) + 1;
    return groups;
  }, {});
}

// What you can see: defects the checks caught, against escapes that have
// already surfaced. Escapes still in production don't count yet, so this
// flatters the checks.
export function observedCatchRate(state) {
  const seen = state.totals.caught + state.totals.surfaced;
  return seen ? state.totals.caught / seen : 1;
}

export function trueCatchRate(state) {
  const all = state.totals.caught + state.totals.escaped;
  return all ? state.totals.caught / all : 1;
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const index = clamp(Math.round((sorted.length - 1) * q), 0, sorted.length - 1);
  return sorted[index];
}

function summarize(runs) {
  const values = runs.map((run) => run.value).sort((a, b) => a - b);
  const nets = runs.map((run) => run.value - run.harm).sort((a, b) => a - b);
  const harms = runs.map((run) => run.harm).sort((a, b) => a - b);
  return {
    count: runs.length,
    valueMedian: quantile(values, 0.5),
    netMedian: quantile(nets, 0.5),
    harmMedian: quantile(harms, 0.5),
    harmP10: quantile(harms, 0.1),
    harmP90: quantile(harms, 0.9),
    severeShare: runs.filter((run) => run.severe > 0).length / Math.max(1, runs.length)
  };
}

// Run the rest of the scenario many times with the plan held, each future
// with its own random draws. Harm counts every escape committed from here on,
// including the ones that would surface after the run ends.
export function futures(originalState, plan = {}, { count = 40 } = {}) {
  const runs = [];
  for (let index = 1; index <= count; index += 1) {
    let state = clone(originalState);
    state.salt = originalState.salt + index;
    const start = { value: state.totals.value, harm: state.totals.harmCommitted, severe: state.totals.severe };
    let first = true;
    while (state.cycle < state.maxCycles) {
      const next = first ? plan : { rooms: plan.rooms, lapseOnEscape: plan.lapseOnEscape };
      state = runCycle(state, next).state;
      first = false;
    }
    const severeLatent = state.latent.filter((defect) => defect.harm >= SEVERE_HARM).length;
    runs.push({
      value: state.totals.value - start.value,
      harm: state.totals.harmCommitted - start.harm,
      severe: state.totals.severe - start.severe + severeLatent
    });
  }
  return summarize(runs);
}

// Replay a whole run's decisions in many futures, from the scenario's start.
export function replayFutures(scenarioId, plans, { count = 200 } = {}) {
  const runs = [];
  for (let index = 1; index <= count; index += 1) {
    let state = createScenario(scenarioId, { salt: index });
    plans.forEach((plan) => {
      if (state.cycle < state.maxCycles) state = runCycle(state, plan).state;
    });
    const severeLatent = state.latent.filter((defect) => defect.harm >= SEVERE_HARM).length;
    runs.push({ value: state.totals.value, harm: state.totals.harmCommitted, severe: state.totals.severe + severeLatent });
  }
  return summarize(runs);
}

export function allRooms(mode) {
  return Object.fromEntries(ROOMS.map((room) => [room.id, mode]));
}

// Two reference policies for the debrief: read everything, or read nothing.
export function benchmarks(scenarioId, { count = 200 } = {}) {
  const hold = (mode) => Array.from({ length: MAX_CYCLES }, () => ({ rooms: allRooms(mode), lapseOnEscape: mode === "lit" }));
  return {
    allLit: replayFutures(scenarioId, hold("lit"), { count }),
    allDark: replayFutures(scenarioId, hold("dark"), { count })
  };
}

function currentRooms(state) {
  return Object.fromEntries(state.rooms.map((room) => [room.id, room.mode]));
}

// Easy-mode guidance. Compare the current plan with the plan plus one change,
// both for the next cycle on this seed and across many futures of the rest of
// the run. The gap between the two is the lesson: a change can win the next
// six weeks and lose the run.
export function evaluateChange(state, plan, change, { count = 40 } = {}) {
  if (state.cycle >= state.maxCycles) return null;
  const basePlan = { buy: [...(plan.buy || [])], rooms: { ...currentRooms(state), ...(plan.rooms || {}) } };
  const candidate = clone(basePlan);

  if (change.type === "card") {
    const card = cardById(change.id);
    const has = candidate.buy.includes(change.id);
    if (has) {
      basePlan.buy = basePlan.buy.filter((id) => id !== change.id);
    } else {
      if (!card.repeatable && state.owned.includes(change.id)) return null;
      candidate.buy.push(change.id);
    }
    if (planCost(candidate) > CYCLE_BUDGET) return null;
    if (change.id === "measure") {
      return {
        classification: "learning", basis: has ? "contribution" : "addition",
        nextValueDelta: 0, nextNetDelta: 0, valueDelta: 0, harmDelta: 0, harmP90Delta: 0, netDelta: 0
      };
    }
  } else {
    const flipped = candidate.rooms[change.id] === "dark" ? "lit" : "dark";
    candidate.rooms[change.id] = flipped;
  }

  const without = basePlan;
  const withIt = candidate;

  const nextWithout = runCycle(state, without).receipt.metric;
  const nextWith = runCycle(state, withIt).receipt.metric;
  const futureWithout = futures(state, without, { count });
  const futureWith = futures(state, withIt, { count });

  const nextValueDelta = nextWith.valuePerWeek - nextWithout.valuePerWeek;
  const valueDelta = futureWith.valueMedian - futureWithout.valueMedian;
  const harmDelta = futureWith.harmMedian - futureWithout.harmMedian;
  const harmP90Delta = futureWith.harmP90 - futureWithout.harmP90;
  const nextNetDelta = nextValueDelta * CYCLE_WEEKS - (nextWith.harmSurfaced - nextWithout.harmSurfaced);
  const netDelta = futureWith.netMedian - futureWithout.netMedian;

  // Net is value shipped minus harm committed, over the rest of the run.
  // "Deferred" is the trap this lab exists for: the next six weeks look
  // better, and the run ends worse.
  const threshold = 10;
  let classification = "neutral";
  if (netDelta < -threshold) {
    classification = nextNetDelta > threshold ? "deferred" : "harmful";
  } else if (netDelta > threshold) {
    classification = harmP90Delta > 25 ? "risky" : "helpful";
  } else if (harmP90Delta > 25) {
    classification = "harmful";
  }

  return {
    classification,
    basis: change.type === "card" && (plan.buy || []).includes(change.id) ? "contribution" : "addition",
    nextValueDelta,
    nextNetDelta,
    valueDelta,
    harmDelta,
    harmP90Delta,
    netDelta
  };
}

// The same run in Leverage Lab's terms: what this factory would mean for
// that model's Build and Verify stages. A translation, not a coupling.
export function leverageTranslation(state) {
  const weeks = Math.max(1, state.cycle * CYCLE_WEEKS);
  const merged = state.totals.merged;
  const ownerHours = (state.totals.reviewMinutes + state.totals.incidentMinutes + state.totals.glanceMinutes) / 60;
  return {
    buildPerWeek: merged / weeks,
    verifyYield: merged ? 1 - state.totals.escaped / merged : 1,
    attentionPerChange: merged ? ownerHours / merged : 0
  };
}

export function formatDelta(value, digits = 1) {
  const rounded = value.toFixed(digits);
  return `${value > 0 ? "+" : ""}${rounded}`;
}
