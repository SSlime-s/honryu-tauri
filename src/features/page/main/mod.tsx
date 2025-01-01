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

interface Props extends BaseProps {}

export function MainView({ pageState, send }: Props) {
	const [partialResponse, setPartialResponse] =
		useState<Partial<Response> | null>(null);

	const isLoading = useMemo(
		() => pageState.matches("ViewLoading"),
		[pageState],
	);
	const response = useMemo(() => pageState.context.response, [pageState]);

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

	const responseOrPartial = isLoading ? partialResponse : response;

	return (
		<div>
			<p>
				detected language:{" "}
				{responseOrPartial?.detected_language !== undefined
					? responseOrPartial.detected_language
					: "loading..."}
			</p>
			{responseOrPartial === null ? (
				<>
					<TextBlockSkeleton />
					<TextBlockSkeleton />
				</>
			) : responseOrPartial.detected_language === "ja" ? (
				<>
					<TextBlock label="Japanese" content={responseOrPartial.ja ?? ""} />
					<TextBlock label="English" content={responseOrPartial.en ?? ""} />
				</>
			) : (
				<>
					<TextBlock label="English" content={responseOrPartial.en ?? ""} />
					<TextBlock label="Japanese" content={responseOrPartial.ja ?? ""} />
				</>
			)}

			<Button
				type="button"
				disabled={isLoading}
				onClick={() => send({ type: "toScreenshot" })}
			>
				Back
			</Button>
		</div>
	);
}
