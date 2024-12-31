import { assign, createMachine } from "xstate";
import { Response } from "../translate/schema.ts";

export const pageMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCGMB0BlAxgJzDADtYALAewBcBiS1Aa2IG0AGAXURXNgEtKfyRTiAAeiAIwAOACwZxANkkB2eUoCcS6SyWSArABoQATwkBmFhl2mlultMmT5amZNMBfN4bSYAajzAA7rTkuATEZFSsHEggyNx8AkIxYghSsgrKqhpaOgbGiJLiGKq2LABM0mXi4lqKHp4gROQQcMLeYG3x-ILCKQC08oYmCH26GGoTk1NT7g3t2PiEJBSUnbzdSaAplUMF8uPS6uIa8grWeh5e6GAYfoFrCT3JiKbSphhvNlKSagpqVbsED8Podficzrl6m4gA */
  id: "page",
  initial: "Screenshot",
  types: {
    context: {} as {
      latestScreenshot: string | null;
      response: Response | null;
      history: Response[];
    },
    events: {} as {
      type: "taken";
      data: string;
    } | {
      type: "loaded";
      data: Response;
    } | {
      type: "toScreenshot";
    },
  },
  context: {
    latestScreenshot: null,
    response: null,
    history: [],
  },
  states: {
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
            history: context.history.concat(event.data),
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
