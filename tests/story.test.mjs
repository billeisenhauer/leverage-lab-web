import test from "node:test";
import assert from "node:assert/strict";

import { buildStory, narration } from "../remotion/src/story.mjs";

// The explainer video narrates claims about the model. These tests fail if a
// change to the model makes any of those claims untrue.

const story = buildStory();

test("opening state: Verify governs while the evidence points at Build", () => {
  assert.equal(story.opening.actual, "verify");
  assert.equal(story.opening.perceived, "build");
  const build = story.opening.stages.find((stage) => stage.id === "build");
  const verify = story.opening.stages.find((stage) => stage.id === "verify");
  assert.ok(build.effective > verify.effective * 3);
  assert.ok(build.coverage > verify.coverage * 2);
});

test("adding builders every cycle lowers outcomes and grows WIP each cycle", () => {
  const { cycles } = story.naive;
  assert.equal(cycles.length, 4);
  cycles.slice(1).forEach((cycle, index) => {
    assert.ok(cycle.outcomes < cycles[index].outcomes);
    assert.ok(cycle.wip > cycles[index].wip);
  });
  cycles.forEach((cycle) => assert.equal(cycle.constraint, "verify"));
});

test("spending at the constraint raises outcomes and moves the constraint twice", () => {
  const [first, second] = story.chase.cycles;
  assert.ok(first.outcomes > story.baseline);
  assert.equal(first.from, "verify");
  assert.equal(first.constraint, "adopt");
  assert.ok(second.outcomes > first.outcomes);
  assert.equal(second.from, "adopt");
  assert.equal(second.constraint, "verify");
});

test("repeating the winning bundle lowers outcomes below the baseline", () => {
  const [, second, third, fourth] = story.chase.cycles;
  assert.deepEqual(third.bundle, second.bundle);
  assert.deepEqual(fourth.bundle, second.bundle);
  assert.ok(third.outcomes < story.baseline);
  assert.ok(fourth.outcomes < third.outcomes);
});

test("narration quotes the model's numbers and stays within one TTS request per scene", () => {
  const scenes = narration(story);
  const text = scenes.map((scene) => scene.text).join(" ");
  assert.match(text, new RegExp(story.naive.cycles[0].outcomes.toFixed(1)));
  assert.match(text, new RegExp(story.naive.cycles[3].outcomes.toFixed(1)));
  assert.match(text, new RegExp(`${story.opening.confidence} percent`));
  scenes.forEach((scene) => assert.ok(scene.text.length < 1000, scene.id));
  assert.equal(new Set(scenes.map((scene) => scene.id)).size, scenes.length);
});
