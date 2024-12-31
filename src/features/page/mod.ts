import type { useMachine } from "@xstate/react";
import type { pageMachine } from "./machine.ts";

export interface BaseProps {
	pageState: ReturnType<typeof useMachine<typeof pageMachine>>[0];
	send: ReturnType<typeof useMachine<typeof pageMachine>>[1];
}
