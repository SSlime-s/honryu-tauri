import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import * as v from "valibot";
import { Button } from "../../../components/ui/button.tsx";
import {
	createGenAIModel,
	transcribeAndTranslateImageStream,
} from "../../translate/mod.tsx";
import { type Response, responseSchema } from "../../translate/schema.ts";
import type { BaseProps } from "../mod.ts";
import { TextBlock, TextBlockSkeleton } from "./TextBlock.tsx";
import {
	ChevronLeft,
	ChevronRight,
	History,
	Loader2,
	Moon,
	Scan,
} from "lucide-react";
import { useHistory } from "./useHistory.tsx";
import { HistoryDialog } from "./HistoryDialog.tsx";

interface Props extends BaseProps {}

export function MainView({ pageState, send }: Props) {
	const [partialResponse, setPartialResponse] =
		useState<Partial<Response> | null>(null);

	const isLoading = useMemo(
		() => pageState.matches("ViewLoading"),
		[pageState],
	);
	const historyManager = useHistory(pageState.context.history);

	useEffect(() => {
		if (isLoading) {
			const abortController = new AbortController();
			const { signal } = abortController;

			(async () => {
				const token = await invoke("get_api_key");
				const tokenResult = v.safeParse(v.string(), token);
				if (!tokenResult.success) {
					throw new Error(`failed to parse token: ${tokenResult.issues}`);
				}
				if (pageState.context.latestScreenshot === null) {
					throw new Error("latest screenshot is null");
				}

				const model = createGenAIModel(tokenResult.output);
				const stream = transcribeAndTranslateImageStream(
					model,
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
			})();

			return () => {
				abortController.abort();
			};
		}
	}, [isLoading, pageState.context.latestScreenshot, send]);

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
					<Button type="button" variant="outline" size="icon">
						<Moon />
					</Button>
				</div>
			</header>
			<main className="grid grid-rows-[1fr,1fr] gap-2 p-4">
				{responseOrPartial === null ? (
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
