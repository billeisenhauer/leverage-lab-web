// Scene lengths and caption timing, shared by the composition and captions.mjs.
// With narration, each scene lasts as long as its voice clip (voice.mjs writes
// timing.json). Without it, scenes run at speaking pace so the silent cut reads
// like the narrated one.
export const FPS = 30;
export const LEAD_IN = 0.3;
const TAIL = 0.9;
const CHARS_PER_SECOND = 15;

export function schedule(lines, timing = {}) {
  let from = 0;
  return lines.map(({ id, text }) => {
    const speech = timing[id] ?? text.length / CHARS_PER_SECOND;
    const frames = Math.ceil((LEAD_IN + speech + TAIL) * FPS);
    const scene = { id, text, from, frames, voiced: id in timing, speechFrames: Math.ceil(speech * FPS) };
    from += frames;
    return scene;
  });
}

// Sentence-level captions, timed by each sentence's share of the scene's text.
// Frames are relative to the scene's start.
export function captionsFor(scene) {
  const sentences = scene.text.match(/[^.!?]+[.!?]+/g) ?? [scene.text];
  const total = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  let start = Math.round(LEAD_IN * FPS);
  return sentences.map((sentence) => {
    const length = Math.round((sentence.length / total) * scene.speechFrames);
    const caption = { text: sentence.trim(), start, end: start + length };
    start += length;
    return caption;
  });
}
