import React, { useState } from "react";
import reactLogo from "./assets/react.svg";
import testImage from "./assets/test-image.png";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import {
  createGenAIModel,
  transcribeAndTranslateImageStream,
} from "./features/translate/mod.tsx";
import { removeMimeType, toBase64 } from "./features/images/base64.ts";
import { saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as v from "valibot";
import { pageMachine } from "./features/page/machine.ts";
import { useMachine } from "@xstate/react";
import { ScreenshotPage } from "./features/page/screenshot/mod.tsx";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [pageState, send] = useMachine(pageMachine);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

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

  async function toggle() {
    const window = await getCurrentWindow();
    const isDecorated = await window.isDecorated();
    await window.setDecorations(!isDecorated);
  }

  if (pageState.matches("Screenshot")) {
    return (
      <ScreenshotPage pageState={pageState} send={send} />
    );
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <button type="button" onClick={test}>Test</button>
      <button type="button" onClick={toggle}>Toggle</button>

      {pageState.matches("ViewLoading")
        ? (
          <button
            type="button"
            onClick={() =>
              send({
                type: "loaded",
                data: {
                  detected_language: "ja",
                  ja: "こんにちは",
                  en: "Hello",
                },
              })}
          >
            Load
          </button>
        )
        : (
          <button type="button" onClick={() => send({ type: "toScreenshot" })}>
            Back
          </button>
        )}
      <p>{greetMsg}</p>
    </main>
  );
}

export default App;
