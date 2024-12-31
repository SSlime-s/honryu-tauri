import React, { useState } from "react";
import reactLogo from "./assets/react.svg";
import testImage from "./assets/test-image.png";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import {
  createGenAIModel,
  transcribeAndTranslateImageStream,
} from "./features/translate/mod.tsx";
import {
  removeMimeType,
  toBase64,
  withMimeType,
} from "./features/images/base64.ts";
import { saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as v from "valibot";
import { pageMachine } from "./features/page/machine.ts";
import { useMachine } from "@xstate/react";
import { ScreenshotPage } from "./features/page/screenshot/mod.tsx";
import { MainView } from "./features/page/main/mod.tsx";

function App() {
  const [pageState, send] = useMachine(pageMachine);

  async function test() {
    const token: string = await invoke("get_api_key");
    const model = createGenAIModel(token);
    const testImageBlob = await fetch(testImage as string).then((res) =>
      res.blob()
    );
    const testImageBase64 = removeMimeType(await toBase64(testImageBlob));
    const stream = transcribeAndTranslateImageStream(model, testImageBase64);
    for await (const response of stream) {
      console.log(response);
    }
  }

  if (pageState.matches("Screenshot")) {
    return <ScreenshotPage pageState={pageState} send={send} />;
  }

  return <MainView pageState={pageState} send={send} />;
}

export default App;
