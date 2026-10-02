// Generates one ElevenLabs narration clip per scene into public/voice/ and
// records each clip's length in src/timing.json, which sets scene lengths.
//
// Needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in ../.env (or the
// environment). Without a voice ID it lists your available voices and stops.
// Clips are cached by text, model, and voice, so re-runs only pay for changed scenes.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildStory, narration } from "./src/story.mjs";

const API = "https://api.elevenlabs.io/v1";
const VOICE_DIR = "public/voice";
const MANIFEST = `${VOICE_DIR}/manifest.json`;

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadEnv("../.env");
const key = process.env.ELEVENLABS_API_KEY;
const voice = process.env.ELEVENLABS_VOICE_ID;
const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

if (!key) {
  console.error("Set ELEVENLABS_API_KEY in leverage-lab-web/.env first.");
  process.exit(1);
}

if (!voice) {
  const response = await fetch(`${API}/voices`, { headers: { "xi-api-key": key } });
  if (!response.ok) throw new Error(`Listing voices failed: ${response.status} ${await response.text()}`);
  const { voices } = await response.json();
  console.log("Pick a voice and set ELEVENLABS_VOICE_ID in leverage-lab-web/.env:\n");
  for (const v of voices) console.log(`  ${v.voice_id}  ${v.name}  ${Object.values(v.labels || {}).join(", ")}`);
  process.exit(0);
}

mkdirSync(VOICE_DIR, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
const timing = {};
let billed = 0;

for (const { id, text } of narration(buildStory())) {
  const hash = createHash("sha256").update(`${model}|${voice}|${text}`).digest("hex").slice(0, 16);
  const file = `${VOICE_DIR}/${id}.mp3`;

  if (manifest[id]?.hash !== hash || !existsSync(file)) {
    const response = await fetch(`${API}/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: model })
    });
    if (!response.ok) throw new Error(`${id}: ${response.status} ${await response.text()}`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    billed += text.length;
    console.log(`generated ${id} (${text.length} chars)`);
  } else {
    console.log(`cached    ${id}`);
  }

  const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
  manifest[id] = { hash, seconds };
  timing[id] = Math.round(seconds * 100) / 100;
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync("src/timing.json", `${JSON.stringify(timing, null, 2)}\n`);
console.log(`\n${billed} characters billed this run. Narration runs ${Object.values(timing).reduce((a, b) => a + b, 0).toFixed(1)}s.`);
