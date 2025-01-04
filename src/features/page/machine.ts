import { assign, fromPromise, setup } from "xstate";
import type { Response } from "../translate/schema.ts";
import { loadConfig, loadConfigStore } from "../config/mod.tsx";
import { check, type Update } from "@tauri-apps/plugin-updater";

export const pageMachine = setup({
	types: {
		context: {} as {
			latestScreenshot: string | null;
			response: Response | null;
			updateInfo: Update | null;
		},
		events: {} as
			| {
					type: "skip";
			  }
			| {
					type: "configLoaded";
			  }
			| {
					type: "taken";
					data: string;
			  }
			| {
					type: "loaded";
					data: Response;
			  }
			| {
					type: "toScreenshot";
			  },
	},
	actors: {
		checkUpdate: fromPromise(async () => {
			const update = await check();
			if (update === null) {
				throw new Error("no new version found");
			}

			assign({ updateInfo: update });
		}),
		checkConfig: fromPromise(async () => {
			const store = await loadConfigStore();
			const config = await loadConfig(store);
			if (config !== null) {
				return;
			}
			throw new Error("config not found");
		}),
	},
}).createMachine({
	id: "page",
	initial: "CheckConfig",
	context: {
		latestScreenshot: null,
		response: null,
		updateInfo: null,
	},
	states: {
		CheckUpdate: {
			invoke: {
				id: "checkUpdate",
				src: "checkUpdate",
				onDone: {
					target: "SelectUpdate",
				},
				onError: {
					target: "CheckConfig",
				},
			},
		},
		SelectUpdate: {
			on: {
				skip: "CheckConfig",
			},
		},
		CheckConfig: {
			invoke: {
				id: "checkConfig",
				src: "checkConfig",
				onDone: {
					target: "Screenshot",
				},
				onError: {
					target: "EnterConfig",
				},
			},
		},
		EnterConfig: {
			on: {
				configLoaded: "Screenshot",
			},
		},
		Screenshot: {
			on: {
				taken: {
					target: "ViewLoading",
					actions: assign(({ context, event }) => ({
						...context,
						latestScreenshot: event.data,
					})),
				},
			},
			entry: () => {
				console.log("Screenshot");
			},
		},
		ViewLoading: {
			on: {
				loaded: {
					target: "View",
					actions: assign(({ context, event }) => ({
						...context,
						response: event.data,
					})),
				},
			},
		},
		View: {
			on: {
				toScreenshot: "Screenshot",
			},
		},
	},
});
