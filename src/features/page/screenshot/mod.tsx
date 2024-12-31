import type { useMachine } from "@xstate/react";
import type { pageMachine } from "../machine.ts";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import * as v from "valibot";
import { mockedScreenshot } from "../../images/mod.ts";

const screenshotSchema = v.object({
  xy: v.tuple([v.number(), v.number()]),
  wh: v.tuple([v.number(), v.number()]),
  image: v.pipe(v.string(), v.base64()),
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

interface Props {
  pageState: ReturnType<typeof useMachine<typeof pageMachine>>[0];
  send: ReturnType<typeof useMachine<typeof pageMachine>>[1];
}
type Coordinate = [x: number, y: number];

export function ScreenshotPage({ pageState, send }: Props) {
  const [wholeImage, setWholeImage] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Coordinate | null>(null);
  const [draggingPosition, setDraggingPosition] = useState<Coordinate | null>(
    null,
  );
  const [windowSize, setWindowSize] = useState<PhysicalSize | null>(null);
  const [windowPosition, setWindowPosition] = useState<PhysicalPosition | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const [containerSize, setContainerSize] = useState<Coordinate | null>(null);
  useEffect(() => {
    if (containerRef.current === null) {
      return;
    }

    const { width, height } = containerRef.current.getBoundingClientRect();
    setContainerSize([width, height]);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize([width, height]);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef.current]);

  useEffect(() => {
    (async function () {
      const window = await getCurrentWindow();
      await window.setDecorations(false);
      await window.setAlwaysOnTop(true);

      // const screenshot = await takeScreenshot();
      const screenshot = await mockedScreenshot();
      setWholeImage(screenshot.image);

      setWindowSize(await window.innerSize());
      setWindowPosition(await window.innerPosition());

      await window.setSize(
        new PhysicalSize(screenshot.wh[0], screenshot.wh[1]),
      );
      await window.setMaxSize(
        new PhysicalSize(screenshot.wh[0], screenshot.wh[1]),
      );
      await window.setPosition(
        new PhysicalPosition(screenshot.xy[0], screenshot.xy[1]),
      );
    })();
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
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

    const window = getCurrentWindow();
    if (windowSize !== null) {
      await window.setSize(windowSize);
    }
    if (windowPosition !== null) {
      await window.setPosition(windowPosition);
    }
    await window.setDecorations(true);
    await window.setAlwaysOnTop(false);

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
      className="size-full cursor-crosshair relative"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      ref={containerRef}
    >
      <img
        src={wholeImage}
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
        </svg>
      )}
    </div>
  );
}
