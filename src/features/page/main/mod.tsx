import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import * as v from "valibot";
import { Button } from "../../../components/ui/button.tsx";
import {
	createGenAIModel,
	transcribeAndTranslateImageStream,
} from "../../translate/mod.tsx";
import {
	type Response,
	responseSchema,
	type ResponseWithTime,
} from "../../translate/schema.ts";
import type { BaseProps } from "../mod.ts";
import { TextBlock, TextBlockSkeleton } from "./TextBlock.tsx";
import {
	ChevronLeft,
	ChevronRight,
	History,
	Loader2,
	Moon,
	Scan,
	Sun,
} from "lucide-react";
import { useHistory } from "./useHistory.tsx";
import { HistoryDialog } from "./HistoryDialog.tsx";
import { useTheme } from "../../theme/useTheme.tsx";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface Props extends BaseProps {
	history: readonly ResponseWithTime[];
	pushHistory: (response: ResponseWithTime) => void;
}

export function MainView({ pageState, send, history, pushHistory }: Props) {
	const [partialResponse, setPartialResponse] =
		useState<Partial<Response> | null>(null);
	const { theme, toggle: toggleTheme, isLoading: isThemeLoading } = useTheme();

	const isLoading = useMemo(
		() => pageState.matches("ViewLoading"),
		[pageState],
	);
	const historyManager = useHistory(history);

	useEffect(() => {
		if (!isThemeLoading) {
			const window = getCurrentWindow();
			void window.show();
		}
	}, [isThemeLoading]);

	useEffect(() => {
		if (isLoading) {
			const abortController = new AbortController();
			const { signal } = abortController;

			(async () => {
				const config = await invoke("get_config");
				const configResult = v.safeParse(
					v.record(v.string(), v.string()),
					config,
				);
				if (!configResult.success) {
					throw new Error(`failed to parse config: ${configResult.issues}`);
				}
				if (pageState.context.latestScreenshot === null) {
					throw new Error("latest screenshot is null");
				}

				const token = configResult.output.GENAI_API_KEY;
				const model = configResult.output.GENAI_MODEL;
				if (token === undefined) {
					throw new Error("GENAI_API_KEY is not defined");
				}
				const genaiModel = createGenAIModel(token, model);
				const stream = transcribeAndTranslateImageStream(
					genaiModel,
					pageState.context.latestScreenshot,
				);
				let responseSnapshot: Partial<Response> | null = null;
				for await (const response of stream) {
					if (signal.aborted) {
						return;
					}
					responseSnapshot = response;
					setPartialResponse(response);
				}

				const streamResult = v.safeParse(responseSchema, responseSnapshot);
				if (!streamResult.success) {
					throw new Error(`failed to parse response: ${streamResult.issues}`);
				}

				send({ type: "loaded", data: streamResult.output });
				pushHistory({
					...streamResult.output,
					time: new Date(),
				});
			})();

			return () => {
				abortController.abort();
			};
		}
	}, [isLoading, pageState.context.latestScreenshot, send, pushHistory]);

	const responseOrPartial = isLoading
		? partialResponse
		: historyManager.current;

	return (
		<div className="size-full grid grid-rows-[auto,1fr] gap-1">
			<header className="flex items-center border-b px-4 py-2 justify-between">
				<Button
					type="button"
					disabled={isLoading}
					onClick={() => send({ type: "toScreenshot" })}
				>
					{isLoading ? <Loader2 className="animate-spin" /> : <Scan />} New
				</Button>
				<div className="flex items-center gap-1">
					<div className="flex items-center">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							disabled={!historyManager.hasPrev}
							onClick={historyManager.prev}
						>
							<ChevronLeft />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							disabled={!historyManager.hasNext}
							onClick={historyManager.next}
						>
							<ChevronRight />
						</Button>
					</div>
					<HistoryDialog
						history={historyManager.history}
						currentIndex={historyManager.currentIndex}
						setIndex={historyManager.setIndex}
						trigger={
							<Button type="button" variant="ghost" size="icon">
								<History />
							</Button>
						}
					/>
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={toggleTheme}
					>
						{theme === "light" ? <Moon /> : <Sun />}
					</Button>
				</div>
			</header>
			<main className="grid grid-rows-[1fr,1fr] gap-2 p-4">
				{responseOrPartial === null || responseOrPartial === undefined ? (
					<>
						<TextBlockSkeleton />
						<TextBlockSkeleton />
					</>
				) : responseOrPartial.detected_language === "ja" ? (
					<>
						<TextBlock
							label="Japanese"
							content={responseOrPartial.ja ?? ""}
							isDetected
						/>
						<TextBlock label="English" content={responseOrPartial.en ?? ""} />
					</>
				) : (
					<>
						<TextBlock
							label="English"
							content={responseOrPartial.en ?? ""}
							isDetected
						/>
						<TextBlock label="Japanese" content={responseOrPartial.ja ?? ""} />
					</>
				)}
			</main>
		</div>
	);
}
