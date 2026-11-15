import { Composition } from "remotion";

import { ExagentDemo } from "./Video";

export const FPS = 30;
export const DURATION = 105 * FPS;

export const RemotionRoot = () => {
  return (
    <Composition
      id="ExagentDemo"
      component={ExagentDemo}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
