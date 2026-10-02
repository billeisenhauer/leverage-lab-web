import React from "react";
import {Composition} from "remotion";
import {Explainer} from "./Explainer";
import {totalFrames} from "./timeline";
import {FPS, HEIGHT, WIDTH} from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="explainer" component={Explainer} durationInFrames={totalFrames} fps={FPS} width={WIDTH} height={HEIGHT} />
);
