import { assign, createMachine, fromPromise } from "xstate";
import type { Response } from "../translate/schema.ts";
import { loadConfig, loadConfigStore } from "../config/mod.tsx";

export const pageMachine = createMachine({
	/** @xstate-layout N4IgpgJg5mDOIC5QAcCGMB0BlAxgJzDADtYALAewBcBiS1Aa2IG0AGAXURXNgEtKfyRTiAAeiAIwAOACwZxANkkB2eUoCcS6SyWSArABoQATwkBmFhl2mlultMmT5amZNMBfN4bSYAajzAA7rTkuATEZFSsHEggyNx8AkIxYghSsgrKqhpaOgbGiJLiGKq2LABM0mXi4lqKHp4gROQQcMLeYG3x-ILCKQC08oYmCH26GGoTk1NT7g3t2PiEJBSUnbzdSaAplUMF8uPS6uIa8grWeh5e6GAYfoFrCT3JiKbSphhvNlKSagpqVbsED8Podficzrl6m4gA */
	id: "page",
	initial: "CheckConfig",
	types: {
		context: {} as {
			latestScreenshot: string | null;
			response: Response | null;
		},
		events: {} as
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
	context: {
		latestScreenshot: null,
		response: null,
	},
	states: {
		CheckConfig: {
			invoke: {
				id: "checkConfig",
				src: fromPromise(async () => {
					const store = await loadConfigStore();
					const config = await loadConfig(store);
					if (config !== null) {
						return;
					}
					throw new Error("config not found");
				}),
				onDone: {
					target: "Screenshot",
				},
				onError: {
					target: "EnterConfig",
				},
			},
			entry: () => {
				console.log("CheckConfig");
			},
		},
		EnterConfig: {
			on: {
				configLoaded: "Screenshot",
			},
			entry: () => {
				console.log("EnterConfig");
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
