import { ConfigForm } from "@/features/config/ConfigForm";
import type { Config } from "@/features/config/mod";
import type { FormValues } from "@/features/config/schema";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect } from "react";
import type { BaseProps } from "../mod";

interface Props extends BaseProps {
	updateConfig: (newConfig: Config) => Promise<void>;
}

export function EnterConfigPage({ updateConfig, send }: Props) {
	useEffect(() => {
		(async () => {
			const window = getCurrentWindow();
			await window.show();
			await window.setDecorations(true);
		})();
	}, []);

	const onSubmit = useCallback(
		async (data: FormValues) => {
			await updateConfig(data);

			const window = getCurrentWindow();
			await window.hide();

			send({ type: "configLoaded" });
		},
		[updateConfig, send],
	);

	return (
		<div className="size-full grid place-items-center p-8">
			<div className="min-w-[480px]">
				<ConfigForm onSubmit={onSubmit} />
			</div>
		</div>
	);
}
