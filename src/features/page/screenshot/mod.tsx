import { invoke } from "@tauri-apps/api/core";
import {
	LogicalPosition,
	LogicalSize,
	PhysicalPosition,
	PhysicalSize,
	getCurrentWindow,
} from "@tauri-apps/api/window";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as v from "valibot";
import Crosshair from "../../../assets/crosshair.svg";
import { withMimeType } from "../../images/base64.ts";
import type { BaseProps } from "../mod.ts";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { isMacOs, isWindows } from "@/features/os/isOsType.ts";
import { MAC_OS_MENU_BAR_HEIGHT } from "@/features/os/mod.ts";

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
	}

	throw new Error(`failed to parse screenshot data: ${result.issues}`);
}

interface Props extends BaseProps {}
type Coordinate = [x: number, y: number];

export function ScreenshotPage({ send }: Props) {
	const [wholeImage, setWholeImage] = useState<string | null>(null);
	const [originalSize, setOriginalSize] = useState<Coordinate | null>(null);
	const [dragStart, setDragStart] = useState<Coordinate | null>(null);
	const [draggingPosition, setDraggingPosition] = useState<Coordinate | null>(
		null,
	);
	const containerRef = useRef<HTMLDivElement>(null);

	const [containerSize, setContainerSize] = useState<Coordinate | null>(null);
	const [scaleFactor, setScaleFactor] = useState<number | null>(null);

	const updateContainerSize = useCallback(() => {
		if (containerRef.current === null) {
			return;
		}

		const { width, height } = containerRef.current.getBoundingClientRect();
		setContainerSize([width, height]);
	}, []);

	useEffect(() => {
		(async () => {
			const currentWindow = getCurrentWindow();
			const isMac = isMacOs();
			const isWin = isWindows();
			await currentWindow.hide();
			await currentWindow.setDecorations(false);

			const screenshot = await takeScreenshot();
			// const screenshot = await mockedScreenshot();
			setWholeImage(screenshot.image);
			setOriginalSize(screenshot.wh);

			await currentWindow.setShadow(false);
			await currentWindow.show();
			const Position = isWin ? PhysicalPosition : LogicalPosition;
			const Size = isWin ? PhysicalSize : LogicalSize;
			await currentWindow.setPosition(
				new Position(
					screenshot.xy[0],
					// NOTE: MacOS ではメニューバーの位置の座標分ずれちゃうから補正
					screenshot.xy[1] - (isMac ? MAC_OS_MENU_BAR_HEIGHT : 0),
				),
			);
			// HACK: windows では decorations が false のとき setSize が効かない
			isWin && (await currentWindow.setDecorations(true));
			await currentWindow.setSize(new Size(screenshot.wh[0], screenshot.wh[1]));

			isWin && (await currentWindow.setDecorations(false));

			// NOTE: macOS では物理ピクセル基準で配置されるっぽいから Mac 以外だけ論理ピクセルに変換
			!isMac && setScaleFactor(window.devicePixelRatio);

			await currentWindow.setAlwaysOnTop(true);
			await currentWindow.setFocus();

			await register("Esc", (event) => {
				if (event.state === "Pressed") {
					void getCurrentWindow().close();
				}
			});

			updateContainerSize();
		})();
	}, [updateContainerSize]);

	const onMouseDown = useCallback((e: React.MouseEvent) => {
		if (e.button !== 0) {
			void getCurrentWindow().close();
			return;
		}
		setDragStart([e.clientX, e.clientY]);
	}, []);
	const onMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (dragStart === null) {
				return;
			}

			const [startX, startY] = dragStart;
			const dx = e.clientX - startX;
			const dy = e.clientY - startY;

			setDraggingPosition([dx, dy]);
		},
		[dragStart],
	);

	const onMouseUp = useCallback(
		async (e: React.MouseEvent) => {
			if (dragStart === null) {
				return;
			}

			const [startX, startY] = dragStart;
			const dx = e.clientX - startX;
			const dy = e.clientY - startY;

			if (dx < 1 || dy < 1) {
				setDragStart(null);
				setDraggingPosition(null);
				return;
			}

			setDraggingPosition(null);
			setDragStart(null);

			if (dx === 0 || dy === 0) {
				return;
			}
			if (containerRef.current === null) {
				return;
			}

			const { width: containerWidth, height: containerHeight } =
				containerRef.current.getBoundingClientRect();
			if (containerWidth <= 0 || containerHeight <= 0) {
				return;
			}
			if (originalSize === null) {
				return;
			}
			const ratioX = containerWidth / originalSize[0];
			const ratioY = containerHeight / originalSize[1];

			const x = Math.round(Math.min(startX, e.clientX) / ratioX);
			const y = Math.round(Math.min(startY, e.clientY) / ratioY);
			const w = Math.round(Math.abs(dx) / ratioX);
			const h = Math.round(Math.abs(dy) / ratioY);

			const cropped = await invoke("crop_image", {
				image: wholeImage,
				xy: [x, y],
				wh: [w, h],
			});
			const result = v.safeParse(v.pipe(v.string(), v.base64()), cropped);

			const window = getCurrentWindow();
			await window.hide();
			await window.setShadow(true);
			await window.setDecorations(true);
			await window.setAlwaysOnTop(false);
			// TODO: ちゃんとした値をいれる
			await window.setSize(new LogicalSize(800, 600));
			await window.setPosition(new PhysicalPosition(100, 100));

			await unregister("Esc");

			if (result.success) {
				send({ type: "taken", data: result.output });
			} else {
				console.error(`failed to parse cropped image: ${result.issues}`);
			}
		},
		[dragStart, wholeImage, originalSize, send],
	);

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
				cursor: `url("${Crosshair}") 12 12, crosshair`,
				height: originalSize ? originalSize[1] / (scaleFactor ?? 1) : undefined,
				width: originalSize ? originalSize[0] / (scaleFactor ?? 1) : undefined,
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
			{containerSize?.every((s) => s > 0) && (
				<svg
					className="size-full absolute inset-0"
					viewBox={`0 0 ${containerSize[0]} ${containerSize[1]}`}
					xmlns="http://www.w3.org/2000/svg"
				>
					<title>{""}</title>
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
