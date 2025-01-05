import { useCallback, useEffect, useState } from "react";
import type { BaseProps } from "../mod";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { relaunch } from "@tauri-apps/plugin-process";
import { Button } from "@/components/ui/button";
import { Check, Loader2, MoveRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Props extends BaseProps {}

export function SelectUpdate({ pageState, send }: Props) {
	const { updateInfo } = pageState.context;
	const [isDownloading, setDownloading] = useState(false);
	const [downloaded, setDownloaded] = useState(0);
	const [total, setTotal] = useState<number | null>(null);
	const [completed, setCompleted] = useState(false);

	useEffect(() => {
		(async () => {
			const window = getCurrentWindow();
			await window.setDecorations(true);
			await window.show();
			await window.setSize(new LogicalSize(400, 200));
		})();
	}, []);

	const updateAndRestart = useCallback(async () => {
		if (updateInfo === null) {
			return;
		}

		setDownloading(true);

		await updateInfo.downloadAndInstall((event) => {
			switch (event.event) {
				case "Started": {
					setTotal(event.data.contentLength ?? null);
					break;
				}
				case "Progress": {
					setDownloaded((prev) => prev + event.data.chunkLength);
					break;
				}
				case "Finished": {
					setCompleted(true);
					break;
				}
			}
		});

		await relaunch();
	}, [updateInfo]);

	const skip = useCallback(async () => {
		const window = getCurrentWindow();
		await window.hide();

		send({ type: "skip" });
	}, [send]);

	if (isDownloading) {
		return (
			<div className="p-4 size-full grid grid-rows-[auto,1fr] gap-4">
				<div>
					<h1
						className={cn(
							"font-bold text-2xl flex items-center gap-2",
							completed && "text-green-500",
						)}
					>
						{completed ? (
							<>
								Complete <Check />
							</>
						) : (
							<>
								Downloading{" "}
								<Loader2 className="animate-spin [animation-duration:2s]" />
							</>
						)}
					</h1>
					{!completed && (
						<p className="font-bold text-xl mt-1">(Do not close this window)</p>
					)}
				</div>
				<div className="font-bold text-lg text-muted-foreground self-center">
					<div className="mb-3 text-right">
						{downloaded} / {total ?? "Unknown"}
					</div>
					{/* TODO: 大体 20MB がちだから、place holder として 20MB を入れてる */}
					<Progress value={(100 * downloaded) / (total ?? 20 * 1000 * 1000)} />
				</div>
			</div>
		);
	}

	return (
		<div className="p-4 size-full flex justify-between flex-col">
			<div>
				<h1 className="font-bold text-2xl">New Update Available !</h1>
				<div className="font-bold text-xl text-muted-foreground">
					v{updateInfo?.version ?? "0.2.1"}
				</div>
				<Button variant="link" asChild>
					<a
						href="https://github.com/SSlime-s/honryu-tauri/releases/latest"
						target="_blank"
						rel="noreferrer noopener"
					>
						<MoveRight /> See details.
					</a>
				</Button>
			</div>
			<div className="flex justify-between flex-wrap gap-2">
				<Button onClick={skip} variant="secondary" size="lg">
					Remind me later
				</Button>
				<Button onClick={updateAndRestart} size="lg">
					Update and restart
				</Button>
			</div>
		</div>
	);
}
