import { useMachine } from "@xstate/react";
import { pageMachine } from "./features/page/machine.ts";
import { MainView } from "./features/page/main/mod.tsx";
import { ScreenshotPage } from "./features/page/screenshot/mod.tsx";
import { ThemeProvider } from "./features/theme/useTheme.tsx";
import { useEternalHistory } from "./features/translate/useEternalHistory.tsx";
import { useEffect } from "react";

function AppInner() {
	const { history, push } = useEternalHistory();
	const [pageState, send] = useMachine(pageMachine);

	if (pageState.matches("Screenshot")) {
		return <ScreenshotPage pageState={pageState} send={send} />;
	}

	return (
		<MainView
			pageState={pageState}
			send={send}
			history={history}
			pushHistory={push}
		/>
	);
}
function App() {
	return (
		<ThemeProvider>
			<AppInner />
		</ThemeProvider>
	);
}

export default App;
