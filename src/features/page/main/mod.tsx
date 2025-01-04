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
	Settings,
	Sun,
} from "lucide-react";
import { useHistory } from "./useHistory.tsx";
import { HistoryDialog } from "./HistoryDialog.tsx";
import { useTheme } from "../../theme/useTheme.tsx";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Config } from "@/features/config/mod.tsx";
import { ConfigDialog } from "./ConfigDialog.tsx";

interface Props extends BaseProps {
	history: readonly ResponseWithTime[];
	pushHistory: (response: ResponseWithTime) => void;
	config: Config | null;
	updateConfig: (newConfig: Config) => Promise<void>;
	version: string;
}

export function MainView({
	pageState,
	send,
	history,
	pushHistory,
	config,
	updateConfig,
	version,
}: Props) {
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
				if (pageState.context.latestScreenshot === null) {
					throw new Error("latest screenshot is null");
				}

				const token = config?.genai_api_key;
				const model = config?.genai_model;
				if (token === undefined) {
					throw new Error("API key is not defined");
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
	}, [
		isLoading,
		pageState.context.latestScreenshot,
		send,
		pushHistory,
		config,
	]);

	const responseOrPartial = isLoading
		? partialResponse
		: historyManager.current;

	return (
		<div className="size-full grid grid-rows-[auto,1fr] gap-1">
			<header className="flex items-center border-b px-5 py-2.5 justify-between">
				<div className="flex items-center gap-3">
					<Button
						type="button"
						disabled={isLoading}
						onClick={() => send({ type: "toScreenshot" })}
					>
						{isLoading ? <Loader2 className="animate-spin" /> : <Scan />} New
					</Button>
					<ConfigDialog
						trigger={
							<Button type="button" variant="ghost" size="icon">
								<Settings />
							</Button>
						}
						config={config}
						updateConfig={updateConfig}
					/>
				</div>
				<div className="flex items-center gap-1">
					<div className="flex items-center">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							disabled={!historyManager.hasPrev || isLoading}
							onClick={historyManager.prev}
						>
							<ChevronLeft />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							disabled={!historyManager.hasNext || isLoading}
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
							<Button
								type="button"
								variant="ghost"
								size="icon"
								disabled={isLoading}
							>
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

			<div className="grid grid-rows-[1fr,auto] gap-1 px-5 pt-5 pb-2">
				<main className="grid grid-rows-[1fr,1fr] gap-4">
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
							<TextBlock
								label="Japanese"
								content={responseOrPartial.ja ?? ""}
							/>
						</>
					)}
				</main>

				<footer>
					<div className="ml-auto w-fit text-muted-foreground text-sm">
						{version !== null && `v${version}`}
					</div>
				</footer>
			</div>
		</div>
	);
}
