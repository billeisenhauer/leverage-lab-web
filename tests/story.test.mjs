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

test("spending at the constraint raises outcomes, then the backlog drains", () => {
  const [first, second] = story.chase.cycles;
  assert.ok(first.outcomes > story.baseline);
  assert.equal(first.from, "verify");
  assert.equal(first.constraint, "adopt");
  assert.ok(second.outcomes > first.outcomes);
  assert.ok(second.wip < first.wip, "cycle 2's peak should come from draining the backlog");
});

test("after cycle 2, arrivals limit output whatever you choose", () => {
  const [, second, third, fourth] = story.chase.cycles;
  const { settle } = story;
  assert.deepEqual(third.bundle, []);
  assert.deepEqual(fourth.bundle, []);
  assert.ok(third.outcomes < second.outcomes);
  assert.ok(settle.arrivals < settle.slowest, "the stages can pass more work than arrives");
  assert.ok(Math.abs(third.outcomes - settle.arrivals) < 1);
  assert.ok(Math.abs(fourth.outcomes - settle.arrivals) < 1);
  assert.ok(Math.abs(third.outcomes - settle.repeatPlan) < 0.6, "repeating the plan should not be the cause");
});

test("stage snapshots show the constraint moving and arrivals falling below capacity", () => {
  const [start, afterFirst, afterSecond] = story.snapshots;
  const effective = (snapshot, id) => snapshot.stages.find((stage) => stage.id === id).effective;
  assert.equal(story.snapshots.length, 3);

  assert.equal(start.slowest, "verify");
  assert.ok(start.arrivals > effective(start, "verify"), "more arrives than Verify can pass, so work piles up");

  assert.equal(afterFirst.slowest, "adopt");
  assert.ok(afterFirst.arrivals < start.arrivals);

  afterSecond.stages.forEach((stage) => assert.ok(stage.effective > afterSecond.arrivals, stage.id));
  assert.equal(afterSecond.arrivals, story.settle.arrivals);
});

test("narration quotes the model's numbers and stays within one TTS request per scene", () => {
  const scenes = narration(story);
  const text = scenes.map((scene) => scene.text).join(" ");
  assert.match(text, new RegExp(story.naive.cycles[0].outcomes.toFixed(1)));
  assert.match(text, new RegExp(story.naive.cycles[3].outcomes.toFixed(1)));
  assert.match(text, new RegExp(`${story.opening.confidence} percent`));
  assert.match(text, /backlog/);
  assert.match(text, /telemetry/i);
  assert.match(text, /bottleneck/);
  assert.match(text, new RegExp(`about ${story.snapshots[0].arrivals} new items arrive`));
  assert.match(text, new RegExp(`only ${story.settle.arrivals} arrive`));
  scenes.forEach((scene) => assert.ok(scene.text.length < 1000, scene.id));
  assert.equal(new Set(scenes.map((scene) => scene.id)).size, scenes.length);
});

test("captions split on sentence ends, not decimal points", async () => {
  const { schedule, captionsFor } = await import("../remotion/src/schedule.mjs");
  const [scene] = schedule([{ id: "x", text: "Verify can pass only 5.7. So Verify sets the pace." }]);
  assert.deepEqual(captionsFor(scene).map((caption) => caption.text), ["Verify can pass only 5.7.", "So Verify sets the pace."]);
});
