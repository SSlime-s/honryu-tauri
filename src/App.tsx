import React from "react";
import { pageMachine } from "./features/page/machine.ts";
import { useMachine } from "@xstate/react";
import { ScreenshotPage } from "./features/page/screenshot/mod.tsx";
import { MainView } from "./features/page/main/mod.tsx";

function App() {
  const [pageState, send] = useMachine(pageMachine);

  if (pageState.matches("Screenshot")) {
    return <ScreenshotPage pageState={pageState} send={send} />;
  }

  return <MainView pageState={pageState} send={send} />;
}

export default App;
