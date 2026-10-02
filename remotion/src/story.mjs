// Every number in the explainer comes from the simulator itself. Change a
// constant in model.mjs, re-render, and the video and narration follow.
import { createScenario, effectiveCapacity, runCycle, stageLabel } from "../../assets/js/model.mjs";

export const SCENARIO = "agent-wave";
export const NAIVE_BUNDLE = ["agents", "partners"];
// Two cycles spent at the constraint, then two with no change. After cycle 2
// the stages can pass more than arrives, so output settles to the arrival
// rate whatever you choose.
export const CHASE_PLAN = [
  ["verification", "release-control"],
  ["adoption", "handoff", "release-control"],
  [],
  []
];

function play(plan) {
  let state = createScenario(SCENARIO);
  return plan.map((bundle) => {
    const result = runCycle(state, bundle, state.diagnosis.actual);
    state = result.state;
    const { metric } = result.receipt;
    return {
      cycle: metric.cycle,
      bundle,
      outcomes: metric.outcomesPerWeek,
      wip: metric.averageWip,
      from: result.receipt.beforeActual,
      constraint: result.receipt.actual
    };
  });
}

// The system after the productive cycles: what arrives, what the slowest
// stage can pass, and what repeating the last plan would score instead.
function settleAfter(plan) {
  let state = createScenario(SCENARIO);
  plan.forEach((bundle) => { state = runCycle(state, bundle).state; });
  return {
    arrivals: state.demand,
    slowest: Math.min(...state.stages.map(effectiveCapacity)),
    repeatPlan: runCycle(state, plan[plan.length - 1]).receipt.metric.outcomesPerWeek
  };
}

// The stages before cycle 1 and after cycles 1 and 2: what each can pass,
// how much new work arrives, and which stage is slowest.
function snapshots(plan) {
  let state = createScenario(SCENARIO);
  const snap = () => ({
    cycle: state.cycle,
    arrivals: state.demand,
    slowest: state.diagnosis.actual,
    stages: state.stages.map((stage) => ({ id: stage.id, label: stage.label, effective: effectiveCapacity(stage) }))
  });
  const result = [snap()];
  plan.forEach((bundle) => {
    state = runCycle(state, bundle).state;
    result.push(snap());
  });
  return result;
}

export function buildStory() {
  const start = createScenario(SCENARIO);
  return {
    scenario: start.scenarioName,
    prompt: start.prompt,
    baseline: start.baseline,
    opening: {
      actual: start.diagnosis.actual,
      perceived: start.diagnosis.perceived,
      confidence: start.diagnosis.confidence,
      stages: start.stages.map((stage) => ({
        id: stage.id,
        label: stage.label,
        effective: effectiveCapacity(stage),
        queue: stage.queue,
        coverage: stage.coverage
      }))
    },
    naive: { bundle: NAIVE_BUNDLE, cycles: play(Array(4).fill(NAIVE_BUNDLE)) },
    chase: { cycles: play(CHASE_PLAN) },
    snapshots: snapshots(CHASE_PLAN.slice(0, 2)),
    settle: settleAfter(CHASE_PLAN.slice(0, 2))
  };
}

const one = (value) => value.toFixed(1).replace(/\.0$/, "");
const whole = (value) => Math.round(value);
const pct = (value) => Math.round(value * 100);
const stageName = (id) => stageLabel(id).split(" / ")[0];

// Written close to ASD-STE100: short sentences, one idea each, plain verbs.
export function narration(story) {
  const stage = (id) => story.opening.stages.find((candidate) => candidate.id === id);
  const naive = story.naive.cycles;
  const [first, second, third] = story.chase.cycles;
  const [{ arrivals: arrive }, afterFirst, afterSecond] = story.snapshots;

  return [
    {
      id: "hook",
      text: "Here is a result that feels wrong. A team nearly doubles how much it can build. But the work that people accept and use does not grow. More building did not create more outcomes. We explore why in Leverage Lab."
    },
    {
      id: "constraint",
      text: `Work moves through six stages, from shape to adopt. The slowest stage is the constraint, the bottleneck. Work can leave only as fast as it passes that stage. Speed up any other stage, and nothing more gets out. Work just piles up in front of the bottleneck. Here, about ${one(arrive)} new items arrive each week. Build can pass ${whole(stage("build").effective)}. Verify can pass only ${one(stage("verify").effective)}. So Verify sets the pace for everything.`
    },
    {
      id: "telemetry",
      text: `To find the constraint, you need telemetry. Telemetry is data about how work moves through each stage. Without it, you can only see which stage is loud. Here, telemetry covers ${pct(stage("build").coverage)} percent of Build, but only ${pct(stage("verify").coverage)} percent of Verify. Build has the biggest queue and the most activity. So the evidence points at Build, with ${story.opening.confidence} percent confidence. It is wrong, because the data is missing where it matters.`
    },
    {
      id: "naive",
      text: `Suppose you trust that evidence. Every cycle, you add more agents and a delivery partner. Over four six-week cycles, accepted outcomes fall from ${one(naive[0].outcomes)} to ${one(naive[3].outcomes)} per week. Work in progress grows from ${whole(naive[0].wip)} items to ${whole(naive[3].wip)}. More building made the system worse.`
    },
    {
      id: "moves",
      text: `Now spend at the real constraint. In cycle one, automate verification and limit new work. Verify gets faster, and arrivals drop to ${one(afterFirst.arrivals)}. Now ${stageName(afterFirst.slowest)} is the slowest stage, so the constraint moves to ${stageName(afterFirst.slowest)}. Output rises to ${one(first.outcomes)} per week. In cycle two, fund adoption and make handoffs clear. Arrivals drop to ${one(afterSecond.arrivals)}, and every stage can now pass more than that. The backlog drains, and output reaches ${one(second.outcomes)} per week.`
    },
    {
      id: "settle",
      text: `But a backlog runs out. In the next cycles, output falls back to ${one(third.outcomes)} per week, even if you change nothing. The pipeline can pass about ${whole(story.settle.slowest)} items a week, but only ${one(story.settle.arrivals)} arrive. The constraint has left the pipeline. Now the limit is how much new work comes in.`
    },
    {
      id: "close",
      text: "The constraint moves. Find it again after every change. Try it yourself in the lab."
    }
  ];
}
