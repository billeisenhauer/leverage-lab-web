export type Cycle = {cycle: number; bundle: string[]; outcomes: number; wip: number; from: string; constraint: string};
export type StageView = {id: string; label: string; effective: number; queue: number; coverage: number};
export type Story = {
  scenario: string;
  prompt: string;
  baseline: number;
  opening: {actual: string; perceived: string; confidence: number; stages: StageView[]};
  naive: {bundle: string[]; cycles: Cycle[]};
  chase: {cycles: Cycle[]};
  snapshots: {cycle: number; arrivals: number; slowest: string; stages: {id: string; label: string; effective: number}[]}[];
  settle: {arrivals: number; slowest: number; repeatPlan: number};
};
export const SCENARIO: string;
export const NAIVE_BUNDLE: string[];
export const CHASE_PLAN: string[][];
export function buildStory(): Story;
export function narration(story: Story): {id: string; text: string}[];
