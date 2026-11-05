import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CARDS,
  ROOMS,
  benchmarks,
  createScenario,
  evaluateChange,
  futures,
  leverageTranslation,
  measurementIsStale,
  replayFutures,
  runCycle
} from "../assets/js/factory.mjs";

function hold(plan, cycles = 4) {
  return Array.from({ length: cycles }, (_, index) => (index === 0 ? plan : { rooms: plan.rooms, lapseOnEscape: plan.lapseOnEscape }));
}

function play(scenarioId, plans) {
  let state = createScenario(scenarioId);
  const receipts = [];
  plans.forEach((plan) => {
    const result = runCycle(state, plan);
    state = result.state;
    receipts.push(result.receipt);
  });
  return { state, receipts };
}

test("a run is deterministic for a scenario and plan", () => {
  const first = runCycle(createScenario("factory-silent-charge"), { buy: ["reconcile"] }, "billing");
  const second = runCycle(createScenario("factory-silent-charge"), { buy: ["reconcile"] }, "billing");
  assert.deepEqual(first, second);
});

test("lights out commits far more harm in its first cycle than it shows", () => {
  const { receipt } = runCycle(createScenario("factory-lights-out"), {});
  assert.ok(receipt.metric.harmCommitted > receipt.metric.harmSurfaced * 2);
  assert.ok(receipt.metric.latentCount > 0);
  assert.ok(receipt.metric.observedCatchRate > receipt.metric.trueCatchRate);
});

test("lights out ships more in its first cycle than lockdown does", () => {
  const dark = runCycle(createScenario("factory-lights-out"), {}).receipt.metric;
  const lit = runCycle(createScenario("factory-lockdown"), {}).receipt.metric;
  assert.ok(dark.valuePerWeek > lit.valuePerWeek);
  assert.ok(dark.harmCommitted > lit.harmCommitted);
  // What you can see in that first cycle understates the difference.
  assert.ok(dark.harmCommitted - lit.harmCommitted > dark.harmSurfaced - lit.harmSurfaced);
});

test("a dark room lapses to lit on its first surfaced escape, unless the rule is off", () => {
  const withRule = runCycle(createScenario("factory-lights-out"), { lapseOnEscape: true });
  assert.ok(withRule.receipt.lapsed.length > 0);
  withRule.receipt.lapsed.forEach((id) => assert.equal(withRule.receipt.roomsAfter[id], "lit"));

  const withoutRule = runCycle(createScenario("factory-lights-out"), {});
  assert.equal(withoutRule.receipt.lapsed.length, 0);
});

test("in lockdown the review queue grows, and capping open changes stops it", () => {
  const held = play("factory-lockdown", hold({}));
  const queues = held.receipts.map((receipt) => receipt.metric.queueAtEnd);
  queues.slice(1).forEach((queue, index) => assert.ok(queue > queues[index]));

  const capped = play("factory-lockdown", hold({ buy: ["wip"] }));
  const last = capped.receipts[capped.receipts.length - 1].metric;
  assert.ok(last.queueAtEnd < queues[queues.length - 1] / 4);
  assert.ok(last.averageWaitWeeks < held.receipts[3].metric.averageWaitWeeks);
});

test("buying a check never lets more defects escape on the same seed", () => {
  const base = runCycle(createScenario("factory-lights-out"), { lapseOnEscape: false }).receipt.metric;
  CARDS.filter((card) => card.catch).forEach((card) => {
    const withCheck = runCycle(createScenario("factory-lights-out"), { buy: [card.id], lapseOnEscape: false }).receipt.metric;
    assert.ok(withCheck.escaped <= base.escaped, card.id);
  });
});

test("reconciling with the provider cuts the silent charge's harm", () => {
  const without = replayFutures("factory-silent-charge", hold({}), { count: 60 });
  const withIt = replayFutures("factory-silent-charge", hold({ buy: ["reconcile"] }), { count: 60 });
  assert.ok(withIt.harmMedian < without.harmMedian * 0.8);
});

test("the poisoned release becomes a severe incident unless a cooldown is in place", () => {
  const without = replayFutures("factory-quiet-bump", hold({}), { count: 60 });
  const withIt = replayFutures("factory-quiet-bump", hold({ buy: ["cooldown"] }), { count: 60 });
  assert.ok(without.severeShare > 0.8);
  assert.equal(withIt.severeShare, 0);

  const { receipts } = play("factory-quiet-bump", hold({ buy: ["cooldown"] }, 2));
  assert.ok(receipts.some((receipt) => receipt.poisonStopped));
});

test("reading nothing ships most and harms most; reading everything is the reverse", () => {
  const { allLit, allDark } = benchmarks("factory-lights-out", { count: 60 });
  assert.ok(allDark.valueMedian > allLit.valueMedian);
  assert.ok(allDark.harmP90 > allLit.harmP90 * 2);
});

test("futures report a spread, not a point", () => {
  const summary = futures(createScenario("factory-lockdown"), {}, { count: 30 });
  assert.equal(summary.count, 30);
  assert.ok(summary.harmP10 <= summary.harmMedian);
  assert.ok(summary.harmMedian <= summary.harmP90);
});

test("easy guidance flags changes that win the next cycle and lose the run", () => {
  const state = createScenario("factory-lockdown");
  const auth = evaluateChange(state, {}, { type: "room", id: "auth" }, { count: 30 });
  assert.equal(auth.classification, "deferred");
  assert.ok(auth.nextNetDelta > 0);
  assert.ok(auth.netDelta < 0);

  assert.equal(evaluateChange(state, {}, { type: "card", id: "wip" }, { count: 30 }).classification, "helpful");
  assert.equal(evaluateChange(state, {}, { type: "card", id: "measure" }).classification, "learning");
});

test("a measurement goes stale when the checks change", () => {
  const measured = runCycle(createScenario("factory-lockdown"), { buy: ["measure"] }).state;
  assert.equal(measurementIsStale(measured), false);
  const changed = runCycle(measured, { buy: ["proof"] }).state;
  assert.equal(measurementIsStale(changed), true);
});

test("a rebuild drill pays down unread code", () => {
  const first = runCycle(createScenario("factory-lights-out"), { lapseOnEscape: false }).state;
  const drilled = runCycle(first, { buy: ["drill"], lapseOnEscape: false }).state;
  const skipped = runCycle(first, { lapseOnEscape: false }).state;
  assert.ok(drilled.history[1].unread < skipped.history[1].unread);
});

test("plans are limited by the budget and by what is already in place", () => {
  assert.throws(() => runCycle(createScenario(), { buy: ["holdout", "canary", "wip"] }), /budget/);
  const owned = runCycle(createScenario(), { buy: ["proof"] }).state;
  assert.throws(() => runCycle(owned, { buy: ["proof"] }), /already/);
  assert.doesNotThrow(() => runCycle(owned, { buy: ["drill"] }));
});

test("the run translates into Leverage Lab's Build and Verify terms", () => {
  const { state } = play("factory-lockdown", hold({}));
  const translation = leverageTranslation(state);
  assert.ok(translation.buildPerWeek > 0);
  assert.ok(translation.verifyYield > 0 && translation.verifyYield <= 1);
  assert.ok(translation.attentionPerChange > 0);
});

// The page and the method notes quote the model. These fail if a model
// change makes a quoted number untrue.

const page = readFileSync(new URL("../factory.html", import.meta.url), "utf8");
const method = readFileSync(new URL("../factory-method.md", import.meta.url), "utf8");

test("the hero quotes lights out's first cycle", () => {
  const metric = runCycle(createScenario("factory-lights-out"), {}).receipt.metric;
  const numbers = [...page.matchAll(/<p class="instrument__number[^"]*">(\d+)<\/p>/g)].map((match) => Number(match[1]));
  assert.deepEqual(numbers, [Math.round(metric.harmSurfaced), Math.round(metric.harmCommitted)]);
});

test("the method page's room table matches the model", () => {
  ROOMS.forEach((room) => {
    const row = `| ${room.label} | ${room.volume} | ${Math.round(room.defectRate * 100)}% | ${room.consequence} | ${room.value} | ${room.reviewMinutes} | ${room.debt} |`;
    assert.ok(method.includes(row), row);
  });
});

test("the method page's card costs match the model", () => {
  CARDS.forEach((card) => {
    assert.ok(method.includes(`| ${card.label} | ${card.cost} |`), card.label);
  });
});
