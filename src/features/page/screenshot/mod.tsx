import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getCurrentWindow,
  LogicalSize,
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import * as v from "valibot";
import { withMimeType } from "../../images/base64.ts";
import type { BaseProps } from "../mod.ts";
import Crosshair from "../../../assets/crosshair.svg";

const screenshotSchema = v.object({
  xy: v.tuple([v.number(), v.number()]),
  wh: v.tuple([v.number(), v.number()]),
  /** NOTE: base64 encode されたものだが、`v.base64` を通すとでかすぎて終わるため string だけチェック */
  image: v.string(),
});
async function takeScreenshot() {
  const screenshotData = await invoke("take_screen_shot");
  const result = v.safeParse(screenshotSchema, screenshotData);
  if (result.success) {
    return result.output;
  } else {
    throw new Error(`failed to parse screenshot data: ${result.issues}`);
  }
}

interface Props extends BaseProps {}
type Coordinate = [x: number, y: number];

export function ScreenshotPage({ send }: Props) {
  const [wholeImage, setWholeImage] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Coordinate | null>(null);
  const [draggingPosition, setDraggingPosition] = useState<Coordinate | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const [containerSize, setContainerSize] = useState<Coordinate | null>(null);

  const updateContainerSize = useCallback(() => {
    if (containerRef.current === null) {
      return;
    }

    const { width, height } = containerRef.current.getBoundingClientRect();
    setContainerSize([width, height]);
  }, [containerRef.current]);

  useEffect(() => {
    (async function () {
      const window = getCurrentWindow();
      await window.setDecorations(false);
      await window.setAlwaysOnBottom(true);

      const screenshot = await takeScreenshot();
      await window.setAlwaysOnBottom(false);
      // const screenshot = await mockedScreenshot();
      setWholeImage(screenshot.image);

      // HACK: decorations が false のとき setSize が効かない
      await window.setDecorations(true);
      await window.setSize(
        new PhysicalSize(screenshot.wh[0], screenshot.wh[1]),
      );
      await window.setDecorations(false);
      await window.setPosition(
        new PhysicalPosition(screenshot.xy[0], screenshot.xy[1]),
      );
      await window.setAlwaysOnTop(true);
      await window.setFocus();

      updateContainerSize();
    })();
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) {
      void getCurrentWindow().close();
      return;
    }
    setDragStart([e.clientX, e.clientY]);
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragStart === null) {
      return;
    }

    const [startX, startY] = dragStart;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    setDraggingPosition([dx, dy]);
  }, [dragStart]);

  const onMouseUp = useCallback(async (e: React.MouseEvent) => {
    if (dragStart === null) {
      return;
    }

    const [startX, startY] = dragStart;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    setDraggingPosition(null);
    setDragStart(null);

    if (dx === 0 || dy === 0) {
      return;
    }

    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const w = Math.abs(dx);
    const h = Math.abs(dy);

    const cropped = await invoke("crop_image", {
      image: wholeImage,
      xy: [x, y],
      wh: [w, h],
    });
    const result = v.safeParse(v.pipe(v.string(), v.base64()), cropped);

    const window = getCurrentWindow();
    await window.setDecorations(true);
    await window.setAlwaysOnTop(false);
    // TODO: ちゃんとした値をいれる
    await window.setSize(new LogicalSize(800, 600));
    await window.setPosition(new PhysicalPosition(100, 100));

    if (result.success) {
      send({ type: "taken", data: result.output });
    } else {
      console.error(`failed to parse cropped image: ${result.issues}`);
    }
  }, [dragStart, wholeImage, send]);

  const draggingArea = useMemo(() => {
    if (dragStart === null || draggingPosition === null) {
      return null;
    }

    const [startX, startY] = dragStart;
    const [dx, dy] = draggingPosition;
    return {
      x: Math.min(startX, startX + dx),
      y: Math.min(startY, startY + dy),
      w: Math.abs(dx),
      h: Math.abs(dy),
    };
  }, [dragStart, draggingPosition]);

  if (wholeImage === null) {
    return null;
  }

  return (
    <div
      className="size-full relative"
      style={{
        cursor: `url("${Crosshair}"), crosshair`,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      ref={containerRef}
    >
      <img
        src={withMimeType(wholeImage, "png")}
        alt=""
        draggable={false}
        className="size-full"
      />
      {containerSize !== null && containerSize.every((s) => s > 0) && (
        <svg
          className="size-full absolute inset-0"
          viewBox={`0 0 ${containerSize[0]} ${containerSize[1]}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d={`M0,0 L${containerSize[0]},0 L${containerSize[0]},${
              containerSize[1]
            } L0,${containerSize[1]} Z ${
              draggingArea === null
                ? ""
                : `M${draggingArea.x},${draggingArea.y} L${
                  draggingArea.x + draggingArea.w
                },${draggingArea.y} L${draggingArea.x + draggingArea.w},${
                  draggingArea.y + draggingArea.h
                } L${draggingArea.x},${draggingArea.y + draggingArea.h} Z`
            }`}
            fill="rgba(0, 0, 0, 0.5)"
          />
          {draggingArea !== null && (
            <rect
              x={draggingArea.x}
              y={draggingArea.y}
              width={draggingArea.w}
              height={draggingArea.h}
              fill="none"
              stroke="white"
            />
          )}
        </svg>
      )}
    </div>
  );
}
