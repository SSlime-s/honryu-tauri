import { assign, fromPromise, setup } from "xstate";
import type { Response } from "../translate/schema.ts";
import { loadConfig, loadConfigStore, type Config } from "../config/mod.tsx";
import { check, type Update } from "@tauri-apps/plugin-updater";

interface Context {
	latestScreenshot: string | null;
	response: Response | null;
	updateInfo: Update | null;
	updatePromise: Promise<Update | null>;
	configPromise: Promise<Config | null>;
}

export const pageMachine = setup({
	types: {
		context: {} as Context,
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
		checkUpdate: fromPromise<Update, Context["updatePromise"]>(
			async ({ input }) => {
				const update = await input;
				if (update === null) {
					throw new Error("no new version found");
				}

				return update;
			},
		),
		checkConfig: fromPromise<void, Context["configPromise"]>(
			async ({ input }) => {
				const config = await input;
				if (config !== null) {
					return;
				}
				throw new Error("config not found");
			},
		),
	},
}).createMachine({
	id: "page",
	initial: "CheckUpdate",
	context: {
		latestScreenshot: null,
		response: null,
		updateInfo: null,
		updatePromise: check(),
		configPromise: loadConfigStore().then(loadConfig),
	},
	states: {
		CheckUpdate: {
			invoke: {
				id: "checkUpdate",
				src: "checkUpdate",
				input: ({ context }) => context.updatePromise,
				onDone: {
					target: "SelectUpdate",
					actions: assign(({ context, event }) => ({
						...context,
						updateInfo: event.output,
					})),
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
				input: ({ context }) => context.configPromise,
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
