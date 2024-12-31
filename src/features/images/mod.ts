import screnshot from "../../assets/screenshot.png";
import { removeMimeType, toBase64 } from "./base64.ts";

interface Screenshot {
  image: string;
  wh: [width: number, height: number];
  xy: [x: number, y: number];
}
export async function mockedScreenshot(): Promise<Screenshot> {
  const screenshot = await fetch(screnshot).then((res) => res.blob());
  const image = await toBase64(screenshot);
  return {
    image: removeMimeType(image),
    xy: [-3840, -640],
    wh: [5760, 2160],
  };
}
