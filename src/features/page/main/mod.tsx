import type { BaseProps } from "../mod.ts";
import { invoke } from "@tauri-apps/api/core";
// @ts-types="@types/react"
import React, { useEffect, useId, useMemo, useState } from "react";
import {
  createGenAIModel,
  transcribeAndTranslateImageStream,
} from "../../translate/mod.tsx";
import { Response, responseSchema } from "../../translate/schema.ts";
import * as v from "valibot";
import { Textarea } from "../../../components/ui/textarea.tsx";
import { Label } from "../../../components/ui/label.tsx";
import { Button } from "../../../components/ui/button.tsx";

interface Props extends BaseProps {}

export function MainView({ pageState, send }: Props) {
  const [partialResponse, setPartialResponse] = useState<
    Partial<Response> | null
  >(null);

  const isLoading = useMemo(() => pageState.matches("ViewLoading"), [
    pageState,
  ]);
  const response = useMemo(() => pageState.context.response, [pageState]);

  useEffect(() => {
    if (isLoading) {
      const abortController = new AbortController();
      const { signal } = abortController;

      (async function () {
        const token = await invoke("get_api_key");
        const tokenResult = v.safeParse(v.string(), token);
        if (!tokenResult.success) {
          throw new Error(`failed to parse token: ${tokenResult.issues}`);
        }

        const model = createGenAIModel(tokenResult.output);
        const stream = transcribeAndTranslateImageStream(
          model,
          pageState.context.latestScreenshot!,
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
  }, [isLoading]);

  const responseOrPartial = isLoading ? partialResponse : response;

  const textareaId = useId();
  const jaId = `${textareaId}-ja`;
  const enId = `${textareaId}-en`;

  const jaBlock = useMemo(() => {
    if (responseOrPartial === null) {
      // TODO
      return null;
    }

    return (
      <div>
        <Label htmlFor={jaId}>Japanese</Label>
        <Textarea id={jaId} readOnly value={responseOrPartial.ja} />
      </div>
    );
  }, [responseOrPartial]);

  const enBlock = useMemo(() => {
    if (responseOrPartial === null) {
      // TODO
      return null;
    }

    return (
      <div>
        <Label htmlFor={enId}>English</Label>
        <Textarea id={enId} readOnly value={responseOrPartial.en} />
      </div>
    );
  }, [responseOrPartial]);

  return (
    <div>
      <p>
        detected language: {responseOrPartial?.detected_language !== undefined
          ? responseOrPartial.detected_language
          : "loading..."}
      </p>
      {responseOrPartial?.detected_language === "ja"
        ? [
          <React.Fragment key="ja">{jaBlock}</React.Fragment>,
          <React.Fragment key="en">{enBlock}</React.Fragment>,
        ]
        : [
          <React.Fragment key="en">{enBlock}</React.Fragment>,
          <React.Fragment key="ja">{jaBlock}</React.Fragment>,
        ]}

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
