// Leverage Lab's own palette (assets/css/main.css). Iowan Old Style and SF Mono
// are system fonts, so the video uses close Google equivalents.
import {loadFont as loadSans} from "@remotion/google-fonts/Inter";
import {loadFont as loadSerif} from "@remotion/google-fonts/Newsreader";
import {loadFont as loadMono} from "@remotion/google-fonts/JetBrainsMono";

export const sans = loadSans("normal", {weights: ["400", "500", "700"], subsets: ["latin"]}).fontFamily;
export const serif = loadSerif("normal", {weights: ["500"], subsets: ["latin"]}).fontFamily;
export const serifItalic = loadSerif("italic", {weights: ["500"], subsets: ["latin"]}).fontFamily;
export const mono = loadMono("normal", {weights: ["400", "500"], subsets: ["latin"]}).fontFamily;

export const forest = "#10231f";
export const forest2 = "#17342d";
export const paper = "#f1f2eb";
export const green = "#66d19e";
export const amber = "#f4b95f";
export const orange = "#e8774d";
export const blue = "#70a9de";
export const mutedLight = "#a9b7b1";
export const lineDark = "rgba(255, 255, 255, 0.14)";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
