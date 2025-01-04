import { load, type Store } from "@tauri-apps/plugin-store";
import { useCallback, useEffect, useState } from "react";
import * as v from "valibot";

const CONFIG_FILE_NAME = "config.json";
const CONFIG_KEY = "config";

const configSchema = v.partial(
	v.object({
		genai_api_key: v.string(),
		genai_model: v.string(),
	}),
);
export type Config = v.InferOutput<typeof configSchema>;

export function loadConfigStore() {
	return load(CONFIG_FILE_NAME, { autoSave: true });
}
export async function loadConfig(store: Store) {
	const config = await store.get(CONFIG_KEY);
	const result = v.safeParse(configSchema, config);
	if (result.success) {
		return result.output;
	}

	return null;
}

export function useConfig() {
	const [store, setStore] = useState<Store | null>(null);
	const [config, setConfig] = useState<Config | null>(null);

	useEffect(() => {
		(async () => {
			setStore(await loadConfigStore());
		})();
	}, []);

	useEffect(() => {
		(async () => {
			if (store === null) {
				return;
			}

			const config = await loadConfig(store);
			if (config !== null) {
				setConfig(config);
			}
		})();
	}, [store]);

	const updateConfig = useCallback(
		async (newConfig: Config) => {
			if (store === null) {
				return;
			}

			setConfig(newConfig);
			await store.set("config", newConfig);
		},
		[store],
	);

	return { config, updateConfig };
}
