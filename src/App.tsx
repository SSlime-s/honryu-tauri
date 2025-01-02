import { useMachine } from "@xstate/react";
import { pageMachine } from "./features/page/machine.ts";
import { MainView } from "./features/page/main/mod.tsx";
import { ScreenshotPage } from "./features/page/screenshot/mod.tsx";
import { ThemeProvider } from "./features/theme/useTheme.tsx";

function AppInner() {
	const [pageState, send] = useMachine(pageMachine);

	if (pageState.matches("Screenshot")) {
		return <ScreenshotPage pageState={pageState} send={send} />;
	}

	return <MainView pageState={pageState} send={send} />;
}
function App() {
	return (
		<ThemeProvider>
			<AppInner />
		</ThemeProvider>
	);
}

export default App;
