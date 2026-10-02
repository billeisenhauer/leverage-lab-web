export const FPS: number;
export const LEAD_IN: number;
export type ScheduledScene = {id: string; text: string; from: number; frames: number; voiced: boolean; speechFrames: number};
export function schedule(lines: {id: string; text: string}[], timing?: Record<string, number>): ScheduledScene[];
export function captionsFor(scene: ScheduledScene): {text: string; start: number; end: number}[];
