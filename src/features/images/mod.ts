import screnshot from "../../assets/screenshot.png";
import { toBase64 } from "./base64.ts";

interface Screenshot {
  image: string;
  wh: [width: number, height: number];
  xy: [x: number, y: number];
}
export async function mockedScreenshot(): Promise<Screenshot> {
  const screenshot = await fetch(screnshot).then((res) => res.blob());
  const image = await toBase64(screenshot);
  return {
    image,
    wh: [-3840, -640],
    xy: [5760, 2160],
  };
}
