// Writes WebVTT captions for the site's <track>, from the same schedule the video uses.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildStory, narration } from "./src/story.mjs";
import { captionsFor, FPS, schedule } from "./src/schedule.mjs";

const timing = existsSync("src/timing.json") ? JSON.parse(readFileSync("src/timing.json", "utf8")) : {};
const stamp = (frame) => new Date((frame / FPS) * 1000).toISOString().slice(11, 23);

const cues = schedule(narration(buildStory()), timing).flatMap((scene) =>
  captionsFor(scene).map(({ text, start, end }) => `${stamp(scene.from + start)} --> ${stamp(scene.from + end)}\n${text}`)
);

mkdirSync("../assets/videos", { recursive: true });
writeFileSync("../assets/videos/explainer.vtt", `WEBVTT\n\n${cues.join("\n\n")}\n`);
console.log(`wrote ${cues.length} cues`);
