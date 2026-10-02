import React from "react";
import {AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame} from "remotion";
import {Frame, Headline, OutcomeChart, Pipeline, SidePanel, Stat, Tag, ease, type Series} from "./parts";
import {captionsFor, LEAD_IN_FRAMES, scenes, story, type Scene} from "./timeline";
import {amber, blue, green, mono, mutedLight, orange, paper, sans} from "./theme";

const STAGE_NAMES: Record<string, string> = {
  verify: "Verify", adopt: "Adopt", release: "Release", "full-kit": "Full Kit", build: "Build", shape: "Shape"
};

// Where a scene is, from 0 to 1, across its spoken part.
const useProgress = (scene: Scene) => {
  const frame = useCurrentFrame();
  return (start: number, end: number) =>
    interpolate(frame, [start * scene.speechFrames, end * scene.speechFrames], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
};

// Visuals keyed to the sentence the narrator is speaking.
const useCues = (scene: Scene) => {
  const frame = useCurrentFrame();
  const captions = captionsFor(scene);
  const cue = (sentence: number) => captions[Math.min(sentence, captions.length - 1)].start;
  return {frame, cue, after: (sentence: number, length = 15) => ease(frame, cue(sentence), length)};
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const naivePoints = [story.baseline, ...story.naive.cycles.map((cycle) => cycle.outcomes)];
const chasePoints = [story.baseline, ...story.chase.cycles.map((cycle) => cycle.outcomes)];
const [firstChase] = story.chase.cycles;
const chaseLabels = ["", `${STAGE_NAMES[firstChase.from]} → ${STAGE_NAMES[firstChase.constraint]}`, "backlog drains", "no change", "no change"];
const scaleMax = Math.max(...story.snapshots.flatMap((snapshot) => snapshot.stages.map((stage) => stage.effective)));
const [before, afterFirst, afterSecond] = story.snapshots;
const verifyPace = before.stages.find((stage) => stage.id === "verify")!.effective;

const Hook: React.FC<{scene: Scene}> = ({scene}) => {
  const {after} = useCues(scene);
  return (
    <Frame scene={scene} kicker="A counter-intuitive result">
      <div style={{position: "absolute", left: 160, top: 210}}>
        <Headline lead="More builders." turn="Same throughput." />
        <div style={{marginTop: 64, display: "flex", gap: 56, width: 1100}}>
          <div style={{flex: 1, opacity: after(1)}}><Stat label="Build capacity" value="nearly 2×" color={green} /></div>
          <div style={{flex: 1, opacity: after(2)}}><Stat label="Accepted outcomes" value="flat" color={orange} /></div>
        </div>
        <div style={{marginTop: 40, opacity: after(4)}}><Tag color={green} solid>Leverage Lab</Tag></div>
      </div>
    </Frame>
  );
};

const ConstraintScene: React.FC<{scene: Scene}> = ({scene}) => {
  const {after} = useCues(scene);
  return (
    <Frame scene={scene} kicker="01 · The bottleneck sets the pace">
      <div style={{position: "absolute", left: 120, top: 150, fontFamily: mono, fontSize: 22, color: mutedLight, opacity: after(0)}}>
        Good work each stage can pass per week
      </div>
      <Pipeline
        stages={before.stages}
        grow={after(0, 45)}
        scaleMax={scaleMax}
        governing={{id: "verify", show: after(7)}}
        lines={[
          {value: before.arrivals, label: `new work arriving · ${before.arrivals}/wk`, color: blue, show: after(5)},
          {value: verifyPace, label: `system pace · ${verifyPace.toFixed(1)}/wk`, color: orange, show: after(8)}
        ]}
      />
    </Frame>
  );
};

const TelemetryScene: React.FC<{scene: Scene}> = ({scene}) => {
  const {after} = useCues(scene);
  return (
    <Frame scene={scene} kicker="02 · Telemetry: what you can see">
      <Pipeline
        stages={story.opening.stages}
        grow={1}
        scaleMax={scaleMax}
        fog={after(2, 30)}
        queues={after(4)}
        perceived={{id: story.opening.perceived, show: after(5), confidence: story.opening.confidence}}
        governing={{id: story.opening.actual, show: after(6)}}
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

const MovesScene: React.FC<{scene: Scene}> = ({scene}) => {
  const {frame, cue, after} = useCues(scene);
  const first = after(2, 30);
  const second = after(6, 30);
  const stages = before.stages.map((stage, index) => ({
    ...stage,
    effective: mix(mix(stage.effective, afterFirst.stages[index].effective, first), afterSecond.stages[index].effective, second)
  }));
  const arrivals = mix(mix(before.arrivals, afterFirst.arrivals, first), afterSecond.arrivals, second);
  const governing = frame < cue(3)
    ? {id: before.slowest, show: 1}
    : {id: afterFirst.slowest, show: after(3, 10) * (1 - after(6, 10))};
  const output = (cycle: number) => ` · output ${story.chase.cycles[cycle].outcomes.toFixed(1)}/wk`;
  const status = frame >= cue(5)
    ? `Cycle 2${frame >= cue(7) ? output(1) : ""}`
    : frame >= cue(1)
      ? `Cycle 1${frame >= cue(4) ? output(0) : ""}`
      : "Before cycle 1";
  return (
    <Frame scene={scene} kicker="04 · Spend at the constraint">
      <div style={{position: "absolute", left: 120, top: 150, fontFamily: mono, fontSize: 24, color: paper}}>{status}</div>
      <Pipeline
        stages={stages}
        grow={1}
        scaleMax={scaleMax}
        governing={governing}
        lines={[{
          value: arrivals,
          label: frame >= cue(6) + 30 ? `new work arriving · ${afterSecond.arrivals}/wk · below every stage` : `new work arriving · ${arrivals.toFixed(1)}/wk`,
          color: blue,
          show: 1
        }]}
      />
    </Frame>
  );
};

const SettleScene: React.FC<{scene: Scene}> = ({scene}) => {
  const at = useProgress(scene);
  const {after} = useCues(scene);
  return (
    <Frame scene={scene} kicker="05 · The backlog runs out">
      <OutcomeChart
        baseline={story.baseline}
        show={1}
        reference={{value: story.settle.arrivals, label: `arrivals ${story.settle.arrivals}/wk`, color: blue, show: after(2)}}
        series={[
          {points: naivePoints, color: orange, progress: 4, opacity: 0.25},
          {points: chasePoints.slice(0, 3), color: green, progress: 2, labels: chaseLabels.slice(0, 3)},
          {points: chasePoints, color: amber, start: 2, valuesBelow: true, progress: 2 + after(1, 40) * 2, labels: chaseLabels.map((label, i) => (i > 2 ? label : ""))}
        ]}
      />
      <SidePanel show={at(0.03, 0.12)}>
        <Step n={3} show={after(1)} text="Change nothing." />
        <Step n={4} show={after(1, 30)} text="Still nothing." />
        <div style={{opacity: after(2)}}><Stat label="Slowest stage can pass" value={`${Math.round(story.settle.slowest)}/wk`} color={green} /></div>
        <div style={{opacity: after(2, 30)}}>
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
  hook: Hook, constraint: ConstraintScene, telemetry: TelemetryScene, naive: NaiveScene, moves: MovesScene, settle: SettleScene, close: Close
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
