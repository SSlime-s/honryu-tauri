import { invoke } from "@tauri-apps/api/core";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import * as v from "valibot";

const themeSchema = v.pipe(
	v.picklist(["auto", "light", "dark"]),
	v.transform((from) => (from === "auto" ? "light" : from)),
);
type Theme = v.InferOutput<typeof themeSchema>;
interface Props {
	children: React.ReactNode;
}
interface ThemeProviderState {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggle: () => void;
	isLoading: boolean;
}
const defaultState: ThemeProviderState = {
	theme: "light",
	setTheme: () => {},
	toggle: () => {},
	isLoading: true,
};
const ThemeContext = createContext<ThemeProviderState>(defaultState);

export function ThemeProvider({ children }: Props) {
	const [theme, setTheme] = useState<Theme | null>(null);

	useEffect(() => {
		(async () => {
			const theme = await invoke("plugin:theme|get_theme");
			const result = v.safeParse(themeSchema, theme);
			if (result.success) {
				setTheme(result.output);
			} else {
				throw new Error(`failed to parse theme: ${result.issues}`);
			}
		})();
	}, []);

	useEffect(() => {
		const root = window.document.documentElement;
		root.classList.remove("light", "dark");

		root.classList.add(theme ?? "light");
	}, [theme]);

	const setThemeOuter = useCallback(async (theme: Theme) => {
		const result = v.safeParse(themeSchema, theme);
		if (!result.success) {
			throw new Error(`failed to parse theme: ${result.issues}`);
		}

		await invoke("plugin:theme|set_theme", { theme });
		setTheme(theme);
	}, []);

	const toggle = useCallback(() => {
		console.log("toggle");
		setThemeOuter(theme === "dark" ? "light" : "dark");
	}, [theme, setThemeOuter]);

	return (
		<ThemeContext.Provider
			value={{
				theme: theme ?? "light",
				setTheme: setThemeOuter,
				toggle,
				isLoading: theme === null,
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}

	return context;
}
