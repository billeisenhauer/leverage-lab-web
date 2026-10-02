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

  return [
    {
      id: "hook",
      text: `${story.prompt} This is Leverage Lab. It is a small simulator that shows why.`
    },
    {
      id: "pipeline",
      text: `Work moves through six stages, from shape to adopt. Work counts only when people use it and someone owns it. Each stage can pass a limited amount of good work each week. Build can pass about ${whole(stage("build").effective)} items. Verify can pass about ${one(stage("verify").effective)}. So Verify sets the pace for the whole system.`
    },
    {
      id: "perceived",
      text: `But you cannot see that. Telemetry shows ${pct(stage("build").coverage)} percent of Build, and only ${pct(stage("verify").coverage)} percent of Verify. Build has the biggest queue and the most activity. So the evidence points at Build, with ${story.opening.confidence} percent confidence. The loudest stage is not the stage that limits output.`
    },
    {
      id: "naive",
      text: `Suppose you trust that evidence. Every cycle, you add more agents and a delivery partner. Over four six-week cycles, accepted outcomes fall from ${one(naive[0].outcomes)} to ${one(naive[3].outcomes)} per week. Work in progress grows from ${whole(naive[0].wip)} items to ${whole(naive[3].wip)}. More building made the system worse.`
    },
    {
      id: "chase",
      text: `Now spend at the real constraint. In cycle one, automate verification and limit new work. Output rises to ${one(first.outcomes)} per week, and the constraint moves to ${stageName(first.constraint)}. In cycle two, fund adoption and make handoffs clear. Output reaches ${one(second.outcomes)} per week, as the backlog drains.`
    },
    {
      id: "settle",
      text: `Then output falls back to ${one(third.outcomes)} per week, even if you change nothing. The ${one(second.outcomes)} was the backlog draining. Now the stages can pass about ${whole(story.settle.slowest)} items a week, but only ${one(story.settle.arrivals)} arrive. The limit has left the pipeline. It is now how much new work comes in.`
    },
    {
      id: "close",
      text: "The constraint moves. Find it again after every change. Try it yourself in the lab."
    }
  ];
}
