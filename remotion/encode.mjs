// Encodes the master into the site's H.264 and AV1 files. Keeps the narration
// track when there is one (src/timing.json is filled by voice.mjs).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const voiced = Object.keys(JSON.parse(readFileSync("src/timing.json", "utf8"))).length > 0;
const audio = voiced ? ["-c:a", "aac", "-b:a", "96k"] : ["-an"];
const ffmpeg = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", "-i", "out/explainer.mp4", ...args], { stdio: "inherit" });

mkdirSync("../assets/videos", { recursive: true });
ffmpeg([...audio, "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "../assets/videos/explainer.mp4"]);
ffmpeg([...(voiced ? ["-c:a", "libopus", "-b:a", "64k"] : ["-an"]), "-c:v", "libsvtav1", "-crf", "50", "-preset", "6", "-pix_fmt", "yuv420p", "-svtav1-params", "log-level=0", "-movflags", "+faststart", "../assets/videos/explainer.av1.mp4"]);
console.log(voiced ? "encoded with narration" : "encoded silent (no narration yet)");
