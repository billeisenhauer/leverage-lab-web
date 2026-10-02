import React from "react";
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {amber, forest, forest2, green, lineDark, mono, mutedLight, orange, paper, sans, serif, serifItalic} from "./theme";
import {captionsFor, type Scene} from "./timeline";

export const ease = (frame: number, start: number, length = 18) =>
  interpolate(frame, [start, start + length], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});

export const Frame: React.FC<{scene: Scene; kicker: string; children: React.ReactNode}> = ({scene, kicker, children}) => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [scene.frames - 8, scene.frames], [1, 0], {extrapolateLeft: "clamp"});
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 70% 0%, ${forest2}, ${forest} 62%)`, color: paper, fontFamily: sans}}>
      <div style={{position: "absolute", top: 56, left: 96, right: 96, display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 22, letterSpacing: 3, textTransform: "uppercase"}}>
        <span style={{color: green}}>Leverage Lab</span>
        <span style={{color: mutedLight}}>{kicker}</span>
      </div>
      <AbsoluteFill style={{opacity: fadeOut}}>{children}</AbsoluteFill>
      <Captions scene={scene} />
    </AbsoluteFill>
  );
};

const Captions: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const current = captionsFor(scene).find((caption) => frame >= caption.start && frame < caption.end + 6);
  if (!current) return null;
  const opacity = Math.min(ease(frame, current.start, 6), 1 - ease(frame, current.end, 6));
  return (
    <div style={{position: "absolute", left: 160, right: 160, bottom: 64, textAlign: "center", fontSize: 36, lineHeight: 1.35, color: paper, opacity}}>
      <span style={{background: "rgba(8, 20, 17, 0.72)", padding: "8px 18px", borderRadius: 10, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone"}}>
        {current.text}
      </span>
    </div>
  );
};

export const Headline: React.FC<{lead: string; turn: string; at?: number; size?: number}> = ({lead, turn, at = 0, size = 150}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rise = (delay: number) => spring({frame: frame - at - delay, fps, config: {damping: 200}});
  return (
    <div style={{fontFamily: serif, fontSize: size, lineHeight: 0.98, letterSpacing: -3}}>
      <div style={{opacity: rise(0), transform: `translateY(${(1 - rise(0)) * 40}px)`}}>{lead}</div>
      <div style={{fontFamily: serifItalic, color: green, opacity: rise(14), transform: `translateY(${(1 - rise(14)) * 40}px)`}}>{turn}</div>
    </div>
  );
};

export const Tag: React.FC<{color: string; children: React.ReactNode; opacity?: number; solid?: boolean}> = ({color, children, opacity = 1, solid}) => (
  <span style={{display: "inline-block", fontFamily: mono, fontSize: 20, letterSpacing: 1.5, textTransform: "uppercase", padding: "8px 14px", borderRadius: 999, border: `2px solid ${color}`, color: solid ? forest : color, background: solid ? color : "transparent", opacity, whiteSpace: "nowrap"}}>
    {children}
  </span>
);

type StageView = {id: string; label: string; effective: number; queue: number; coverage: number};

// Six columns. Bar height is the stage's effective weekly capacity; dots are its queue.
export const Pipeline: React.FC<{
  stages: StageView[];
  grow: number;
  fog?: number;
  governing?: {id: string; show: number};
  perceived?: {id: string; show: number; confidence: number};
  queues?: number;
}> = ({stages, grow, fog = 0, governing, perceived, queues = 0}) => {
  const max = Math.max(...stages.map((stage) => stage.effective));
  const barMax = 360;
  return (
    <div style={{position: "absolute", left: 120, right: 120, top: 200, display: "flex", gap: 28}}>
      {stages.map((stage, index) => {
        const isGoverning = governing?.id === stage.id;
        const isPerceived = perceived?.id === stage.id;
        const stagger = interpolate(grow, [index * 0.08, index * 0.08 + 0.5], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
        const height = (stage.effective / max) * (barMax - 70) * stagger;
        const color = isGoverning && governing!.show > 0 ? orange : isPerceived && perceived!.show > 0 ? amber : green;
        const hidden = fog * (1 - stage.coverage);
        return (
          <div key={stage.id} style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch"}}>
            <div style={{height: 64, display: "flex", alignItems: "flex-end", justifyContent: "center"}}>
              {isGoverning && <Tag color={orange} opacity={governing!.show} solid>Governs</Tag>}
              {isPerceived && <Tag color={amber} opacity={perceived!.show}>Looks stuck · {perceived!.confidence}%</Tag>}
            </div>
            <div style={{position: "relative", height: barMax, marginTop: 16, borderBottom: `2px solid ${lineDark}`, display: "flex", alignItems: "flex-end", justifyContent: "center"}}>
              <div style={{width: "62%", height, background: color, borderRadius: "10px 10px 0 0", opacity: 0.92}} />
              <div style={{position: "absolute", bottom: height + 12, fontFamily: mono, fontSize: 28, color: paper, opacity: stagger}}>
                {stage.effective.toFixed(1)}
              </div>
              <div style={{position: "absolute", inset: 0, background: forest, opacity: hidden * 0.85, borderRadius: 10}} />
            </div>
            <div style={{marginTop: 18, textAlign: "center", fontSize: 30, fontWeight: 700}}>{stage.label.split(" / ")[0]}</div>
            <div style={{marginTop: 6, textAlign: "center", fontFamily: mono, fontSize: 22, color: stage.coverage < 0.5 ? orange : mutedLight, opacity: fog}}>
              {Math.round(stage.coverage * 100)}% visible
            </div>
            <div style={{marginTop: 14, display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", minHeight: 60, opacity: queues}}>
              {Array.from({length: stage.queue}, (_, dot) => (
                <span key={dot} style={{width: 13, height: 13, borderRadius: 4, background: isGoverning ? orange : mutedLight, opacity: 0.85}} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export type Series = {points: number[]; color: string; progress: number; opacity?: number; labels?: string[]; start?: number};

// Accepted outcomes per week by cycle. Cycle 0 is the scenario's baseline.
export const OutcomeChart: React.FC<{baseline: number; series: Series[]; show: number; yMax?: number}> = ({baseline, series, show, yMax = 11}) => {
  const left = 230, top = 190, width = 940, height = 560;
  const x = (cycle: number) => left + (cycle / 4) * width;
  const y = (value: number) => top + height - (value / yMax) * height;

  const path = ({points, progress, start = 0}: Series) => {
    const full = Math.floor(progress);
    const coords = points.slice(start, full + 1).map((value, index) => [x(start + index), y(value)]);
    if (full < points.length - 1 && progress > full) {
      const t = progress - full;
      coords.push([x(full + t), y(points[full] + (points[full + 1] - points[full]) * t)]);
    }
    return coords.map(([px, py], index) => `${index ? "L" : "M"}${px},${py}`).join(" ");
  };

  return (
    <svg width={1920} height={1080} style={{position: "absolute", inset: 0, opacity: show}}>
      {[0, 2, 4, 6, 8, 10].map((tick) => (
        <g key={tick}>
          <line x1={left} x2={left + width} y1={y(tick)} y2={y(tick)} stroke={lineDark} strokeWidth={2} />
          <text x={left - 24} y={y(tick) + 9} fill={mutedLight} fontFamily={mono} fontSize={24} textAnchor="end">{tick}</text>
        </g>
      ))}
      {[0, 1, 2, 3, 4].map((cycle) => (
        <text key={cycle} x={x(cycle)} y={top + height + 48} fill={mutedLight} fontFamily={mono} fontSize={24} textAnchor="middle">
          {cycle === 0 ? "start" : `cycle ${cycle}`}
        </text>
      ))}
      <text x={left} y={top - 40} fill={paper} fontFamily={sans} fontSize={30} fontWeight={700}>Accepted outcomes per week</text>
      <line x1={left} x2={left + width} y1={y(baseline)} y2={y(baseline)} stroke={mutedLight} strokeWidth={2} strokeDasharray="10 10" />
      <text x={left + width + 18} y={y(baseline) + 8} fill={mutedLight} fontFamily={mono} fontSize={22}>baseline</text>
      {series.map((line, index) => (
        <g key={index} opacity={line.opacity ?? 1}>
          <path d={path(line)} fill="none" stroke={line.color} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
          {line.points.map((value, cycle) =>
            cycle > (line.start ?? 0) && line.progress >= cycle ? (
              <g key={cycle}>
                <circle cx={x(cycle)} cy={y(value)} r={11} fill={line.color} />
                {(line.opacity ?? 1) === 1 && (
                  <text x={x(cycle)} y={y(value) - 26} fill={paper} fontFamily={mono} fontSize={28} textAnchor="middle">{value.toFixed(1)}</text>
                )}
                {line.labels?.[cycle] && (
                  <text x={x(cycle)} y={top + height + 88} fill={line.color} fontFamily={mono} fontSize={22} textAnchor="middle">{line.labels[cycle]}</text>
                )}
              </g>
            ) : null
          )}
        </g>
      ))}
    </svg>
  );
};

export const SidePanel: React.FC<{show: number; children: React.ReactNode}> = ({show, children}) => (
  <div style={{position: "absolute", right: 110, top: 190, width: 420, opacity: show, transform: `translateX(${(1 - show) * 30}px)`, display: "flex", flexDirection: "column", gap: 22}}>
    {children}
  </div>
);

export const Stat: React.FC<{label: string; value: string; color: string}> = ({label, value, color}) => (
  <div style={{borderTop: `2px solid ${lineDark}`, paddingTop: 18}}>
    <div style={{fontFamily: mono, fontSize: 20, letterSpacing: 2, textTransform: "uppercase", color: mutedLight}}>{label}</div>
    <div style={{fontFamily: serif, fontSize: 92, lineHeight: 1.05, color}}>{value}</div>
  </div>
);
