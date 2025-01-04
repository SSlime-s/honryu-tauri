import { useMachine } from "@xstate/react";
import { pageMachine } from "./features/page/machine.ts";
import { MainView } from "./features/page/main/mod.tsx";
import { ScreenshotPage } from "./features/page/screenshot/mod.tsx";
import { ThemeProvider } from "./features/theme/useTheme.tsx";
import { useEternalHistory } from "./features/translate/useEternalHistory.tsx";
import { useConfig } from "./features/config/mod.tsx";
import { EnterConfigPage } from "./features/page/enterConfig/mod.tsx";
import { useVersion } from "./lib/utils/useVersion.ts";

function AppInner() {
	const { history, push } = useEternalHistory();
	const { config, updateConfig } = useConfig();
	const [pageState, send] = useMachine(pageMachine);
	const version = useVersion();

	if (pageState.matches("EnterConfig")) {
		return (
			<EnterConfigPage
				updateConfig={updateConfig}
				pageState={pageState}
				send={send}
			/>
		);
	}

	if (pageState.matches("Screenshot")) {
		return <ScreenshotPage pageState={pageState} send={send} />;
	}

	if (pageState.matches("ViewLoading") || pageState.matches("View")) {
		return (
			<MainView
				pageState={pageState}
				send={send}
				history={history}
				pushHistory={push}
				config={config}
				updateConfig={updateConfig}
				version={version}
			/>
		);
	}

	return null;
}
function App() {
	return (
		<ThemeProvider>
			<AppInner />
		</ThemeProvider>
	);
}

export default App;
