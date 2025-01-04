import type { UseFormReturn } from "react-hook-form";
import type { FormValues } from "./schema";
import { useCallback, useState, useTransition } from "react";
import { verifyAPIKey } from "../translate/mod";
import { Button } from "@/components/ui/button";
import { BadgeCheck, BadgeX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface State {
	result: "ok" | "ng";
	token: string;
}

interface Props {
	form: UseFormReturn<FormValues>;
}
export function TokenVerifierButton({ form }: Props) {
	const apiToken = form.watch("genai_api_key");
	const [state, setState] = useState<State | null>(null);
	const [isPending, startTransition] = useTransition();

	const verify = useCallback(async () => {
		const value = form.getValues().genai_api_key;

		return startTransition(async () => {
			const result = await verifyAPIKey(value);

			setState({
				result: result ? "ok" : "ng",
				token: value,
			});
		});
	}, [form]);

	const status = isPending
		? "pending"
		: state === null || state.token !== apiToken
			? "idle"
			: state.result === "ok"
				? "ok"
				: "ng";

	return (
		<Button
			type="button"
			disabled={isPending}
			onClick={verify}
			variant={status === "ng" ? "destructive" : "default"}
			size="sm"
			className={cn(status === "ok" && "bg-green-400")}
		>
			{status === "pending" ? (
				<Loader2 className="animate-spin" />
			) : status === "idle" ? (
				<span>Verify</span>
			) : status === "ok" ? (
				<div className="flex items-center gap-2">
					<BadgeCheck />
					Verified
				</div>
			) : (
				<div className="flex items-center gap-2">
					<BadgeX />
					Verify Failed
				</div>
			)}
		</Button>
	);
}
