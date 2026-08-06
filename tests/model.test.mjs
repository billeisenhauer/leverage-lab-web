import test from "node:test";
import assert from "node:assert/strict";

import {
  createScenario,
  diagnose,
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
