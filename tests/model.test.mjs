import test from "node:test";
import assert from "node:assert/strict";

import {
  createScenario,
  diagnose,
  evaluateInvestmentImpact,
  investmentCost,
  runCycle
} from "../assets/js/model.mjs";

test("agent wave begins with Verify as the actual constraint and Build as the perceived constraint", () => {
  const state = createScenario("agent-wave");
  assert.equal(state.diagnosis.actual, "verify");
  assert.equal(state.diagnosis.perceived, "build");
});

test("adding agents does not move the governing constraint away from Verify", () => {
  const state = createScenario("agent-wave");
  const result = runCycle(state, ["agents"], "build");
  assert.equal(result.state.diagnosis.actual, "verify");
  assert.ok(result.state.stages.find((stage) => stage.id === "build").capacity > 24);
});

test("verification investment moves the agent-wave constraint downstream", () => {
  const state = createScenario("agent-wave");
  const result = runCycle(state, ["verification"], "verify");
  assert.equal(result.receipt.beforeActual, "verify");
  assert.notEqual(result.state.diagnosis.actual, "verify");
});

test("instrumentation increases coverage without changing physical capacity", () => {
  const state = createScenario("dark-system");
  const capacities = state.stages.map((stage) => stage.capacity);
  const result = runCycle(state, ["observe"], "verify");
  assert.deepEqual(result.state.stages.map((stage) => stage.capacity), capacities);
  assert.ok(result.state.stages.every((stage, index) => stage.coverage > state.stages[index].coverage));
});

test("simulation is deterministic for a scenario, allocation, and prediction", () => {
  const first = runCycle(createScenario("partner-surge"), ["full-kit", "observe"], "full-kit");
  const second = runCycle(createScenario("partner-surge"), ["full-kit", "observe"], "full-kit");
  assert.deepEqual(first, second);
});

test("investment costs are explicit and additive", () => {
  assert.equal(investmentCost(["observe", "verification"]), 8);
  assert.throws(
    () => runCycle(createScenario(), ["verification", "foundation", "observe"], "verify"),
    /exceeds/
  );
});

test("easy guidance changes when the current intervention bundle changes", () => {
  const state = createScenario("agent-wave");
  const standalone = evaluateInvestmentImpact(state, [], "full-kit");
  const combined = evaluateInvestmentImpact(state, ["verification"], "full-kit");

  assert.equal(standalone.basis, "addition");
  assert.equal(combined.basis, "addition");
  assert.equal(standalone.classification, "harmful");
  assert.equal(combined.classification, "helpful");
  assert.equal(state.cycle, 0);
  assert.ok(Number.isFinite(standalone.outcomeDelta));
  assert.ok(Number.isFinite(combined.outcomeDelta));
});

test("instrumentation is identified as learning value when immediate throughput is flat", () => {
  const impact = evaluateInvestmentImpact(createScenario("dark-system"), [], "observe");

  assert.equal(impact.outcomeDelta, 0);
  assert.equal(impact.classification, "learning");
  assert.ok(impact.coverageDelta > 0);
});

test("selected intervention guidance reports its marginal contribution", () => {
  const impact = evaluateInvestmentImpact(
    createScenario("partner-surge"),
    ["full-kit", "partners"],
    "partners"
  );

  assert.equal(impact.basis, "contribution");
});
