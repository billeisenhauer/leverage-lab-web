import timing from "./timing.json";
import {buildStory, narration} from "./story.mjs";
import {captionsFor as captionsForScene, LEAD_IN, schedule} from "./schedule.mjs";
import {FPS} from "./theme";

export type Scene = {id: string; text: string; from: number; frames: number; voiced: boolean; speechFrames: number};
export type Caption = {text: string; start: number; end: number};

export const story = buildStory();
export const scenes: Scene[] = schedule(narration(story), timing as Record<string, number>);
export const LEAD_IN_FRAMES = Math.round(LEAD_IN * FPS);
export const totalFrames = scenes.reduce((sum, scene) => sum + scene.frames, 0);
export const captionsFor = (scene: Scene): Caption[] => captionsForScene(scene);
