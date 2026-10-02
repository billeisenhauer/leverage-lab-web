import React from "react";
import {AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame} from "remotion";
import {Frame, Headline, OutcomeChart, Pipeline, SidePanel, Stat, Tag, ease, type Series} from "./parts";
import {LEAD_IN_FRAMES, scenes, story, type Scene} from "./timeline";
import {amber, blue, green, mono, mutedLight, orange, sans} from "./theme";

const STAGE_NAMES: Record<string, string> = {
  verify: "Verify", adopt: "Adopt", release: "Release", "full-kit": "Full Kit", build: "Build", shape: "Shape"
};

// Where a scene is, from 0 to 1, across its spoken part.
const useProgress = (scene: Scene) => {
  const frame = useCurrentFrame();
  return (start: number, end: number) =>
    interpolate(frame, [start * scene.speechFrames, end * scene.speechFrames], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
};

const naivePoints = [story.baseline, ...story.naive.cycles.map((cycle) => cycle.outcomes)];
const chasePoints = [story.baseline, ...story.chase.cycles.map((cycle) => cycle.outcomes)];
const [firstChase] = story.chase.cycles;
const chaseLabels = ["", `${STAGE_NAMES[firstChase.from]} → ${STAGE_NAMES[firstChase.constraint]}`, "backlog drains", "no change", "no change"];

const Hook: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  return (
    <Frame scene={scene} kicker="A constraint simulator">
      <div style={{position: "absolute", left: 160, top: 250}}>
        <Headline lead="More builders." turn="Same throughput." />
        <div style={{marginTop: 56, fontFamily: mono, fontSize: 28, color: mutedLight, opacity: ease(frame, 40)}}>
          Scenario · {story.scenario}
        </div>
      </div>
    </Frame>
  );
};

const PipelineScene: React.FC<{scene: Scene}> = ({scene}) => {
  const at = useProgress(scene);
  return (
    <Frame scene={scene} kicker="01 · Six stages">
      <Pipeline
        stages={story.opening.stages}
        grow={at(0.3, 0.7)}
        governing={{id: story.opening.actual, show: at(0.82, 0.9)}}
        queues={0}
      />
      <div style={{position: "absolute", left: 120, top: 150, fontFamily: mono, fontSize: 22, color: mutedLight, opacity: at(0.3, 0.38)}}>
        Good work each stage can pass per week
      </div>
    </Frame>
  );
};

const PerceivedScene: React.FC<{scene: Scene}> = ({scene}) => {
  const at = useProgress(scene);
  return (
    <Frame scene={scene} kicker="02 · What telemetry shows">
      <Pipeline
        stages={story.opening.stages}
        grow={1}
        fog={at(0.02, 0.3)}
        queues={at(0.3, 0.45)}
        perceived={{id: story.opening.perceived, show: at(0.5, 0.6), confidence: story.opening.confidence}}
        governing={{id: story.opening.actual, show: at(0.85, 0.95)}}
      />
    </Frame>
  );
};

const NaiveScene: React.FC<{scene: Scene}> = ({scene}) => {
  const at = useProgress(scene);
  const draw = at(0.3, 0.72) * 4;
  const cycle = Math.max(0, Math.min(3, Math.ceil(draw) - 1));
  const wip = story.naive.cycles[cycle].wip;
  return (
    <Frame scene={scene} kicker="03 · Trust the loud signal">
      <OutcomeChart baseline={story.baseline} show={at(0, 0.1)} series={[{points: naivePoints, color: orange, progress: draw}]} />
      <SidePanel show={at(0.08, 0.2)}>
        <div><Tag color={orange}>Every cycle</Tag></div>
        <div style={{fontSize: 34, fontWeight: 700, lineHeight: 1.25}}>Add agents and a delivery partner</div>
        <Stat label="Work in progress" value={draw > 0 ? Math.round(wip).toString() : "—"} color={orange} />
        <div style={{fontFamily: mono, fontSize: 22, color: mutedLight}}>Constraint: {STAGE_NAMES[story.naive.cycles[cycle].constraint]}, every cycle</div>
      </SidePanel>
    </Frame>
  );
};

const ChaseScene: React.FC<{scene: Scene}> = ({scene}) => {
  const at = useProgress(scene);
  const draw = at(0.2, 0.42) + at(0.58, 0.82);
  return (
    <Frame scene={scene} kicker="04 · Spend at the constraint">
      <OutcomeChart
        baseline={story.baseline}
        show={1}
        series={[
          {points: naivePoints, color: orange, progress: 4, opacity: 0.25},
          {points: chasePoints.slice(0, 3), color: green, progress: draw, labels: chaseLabels.slice(0, 3)}
        ]}
      />
      <SidePanel show={at(0.05, 0.15)}>
        <Step n={1} show={at(0.12, 0.22)} text="Automate verification. Limit new work." />
        <Step n={2} show={at(0.5, 0.6)} text="Fund adoption. Make handoffs clear. Keep the limit." />
      </SidePanel>
    </Frame>
  );
};

const SettleScene: React.FC<{scene: Scene}> = ({scene}) => {
  const at = useProgress(scene);
  return (
    <Frame scene={scene} kicker="05 · The backlog runs out">
      <OutcomeChart
        baseline={story.baseline}
        show={1}
        reference={{value: story.settle.arrivals, label: `arrivals ${story.settle.arrivals}/wk`, color: blue, show: at(0.45, 0.6)}}
        series={[
          {points: naivePoints, color: orange, progress: 4, opacity: 0.25},
          {points: chasePoints.slice(0, 3), color: green, progress: 2, labels: chaseLabels.slice(0, 3)},
          {points: chasePoints, color: amber, start: 2, valuesBelow: true, progress: 2 + at(0.05, 0.3) * 2, labels: chaseLabels.map((label, i) => (i > 2 ? label : ""))}
        ]}
      />
      <SidePanel show={at(0.03, 0.12)}>
        <Step n={3} show={at(0.05, 0.15)} text="Change nothing." />
        <Step n={4} show={at(0.2, 0.3)} text="Still nothing." />
        <Stat label="Slowest stage can pass" value={`${Math.round(story.settle.slowest)}/wk`} color={green} />
        <div style={{opacity: at(0.45, 0.6)}}>
          <Stat label="New work arriving" value={`${story.settle.arrivals}/wk`} color={blue} />
        </div>
      </SidePanel>
    </Frame>
  );
};

const Step: React.FC<{n: number; text: string; show: number}> = ({n, text, show}) => (
  <div style={{opacity: show, transform: `translateY(${(1 - show) * 16}px)`, borderTop: "2px solid rgba(255,255,255,0.14)", paddingTop: 18}}>
    <div style={{fontFamily: mono, fontSize: 20, letterSpacing: 2, color: mutedLight, textTransform: "uppercase"}}>Cycle {n}</div>
    <div style={{fontSize: 32, fontWeight: 700, lineHeight: 1.3, marginTop: 6}}>{text}</div>
  </div>
);

const Close: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  return (
    <Frame scene={scene} kicker="06 · The lesson">
      <div style={{position: "absolute", left: 160, top: 250}}>
        <Headline lead="The constraint moves." turn="Find it again." size={128} />
        <div style={{marginTop: 64, display: "flex", gap: 28, alignItems: "center", opacity: ease(frame, 50)}}>
          <Tag color={green} solid>Enter the lab</Tag>
          <span style={{fontFamily: mono, fontSize: 30, color: mutedLight}}>billeisenhauer.github.io/leverage-lab-web</span>
        </div>
        <div style={{marginTop: 28, fontFamily: sans, fontSize: 24, color: mutedLight, opacity: ease(frame, 60)}}>
          A deterministic teaching model, not a forecast for any company.
        </div>
      </div>
    </Frame>
  );
};

const VIEWS: Record<string, React.FC<{scene: Scene}>> = {
  hook: Hook, pipeline: PipelineScene, perceived: PerceivedScene, naive: NaiveScene, chase: ChaseScene, settle: SettleScene, close: Close
};

export const Explainer: React.FC = () => (
  <AbsoluteFill>
    {scenes.map((scene) => {
      const View = VIEWS[scene.id];
      return (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.frames} name={scene.id}>
          <View scene={scene} />
          {scene.voiced && (
            <Sequence from={LEAD_IN_FRAMES}>
              <Html5Audio src={staticFile(`voice/${scene.id}.mp3`)} />
            </Sequence>
          )}
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
