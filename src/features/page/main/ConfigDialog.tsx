import { useMemo, type ReactNode } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTrigger,
} from "@/components/ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import type { Config } from "@/features/config/mod";
import { ConfigForm } from "@/features/config/ConfigForm";
import { formSchema, type FormValues } from "@/features/config/schema";
import * as v from "valibot";

interface Props {
	trigger: ReactNode;
	config: Config | null;
	updateConfig: (newConfig: Config) => Promise<void>;
}
export function ConfigDialog({ trigger, config, updateConfig }: Props) {
	const parsedConfig = useMemo(() => {
		if (config === null) {
			return undefined;
		}

		const keys = Object.keys(config) as (keyof Config)[];
		const validatorEntries = formSchema.entries;
		const parsed: Record<string, string> = {};
		for (const key of keys) {
			const schema = validatorEntries[key];
			if (schema === undefined) {
				continue;
			}

			const result = v.safeParse(schema, config[key]);
			if (result.success) {
				parsed[key] = result.output;
			}
		}

		return parsed as Partial<FormValues>;
	}, [config]);

	return (
		<Dialog>
			<DialogTrigger asChild>{trigger}</DialogTrigger>

			<DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>Config</DialogTitle>
				</DialogHeader>

				<div className="overflow-auto p-[2px]">
					<ConfigForm
						defaultValues={parsedConfig}
						onSubmit={updateConfig}
						forUpdate
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
