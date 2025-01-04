import { useCallback, type ReactNode } from "react";
import type { ResponseWithTime } from "../../translate/schema";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DialogTitle } from "@radix-ui/react-dialog";
import { formatISO, formatISO9075 } from "date-fns/fp";

interface Props {
	history: readonly ResponseWithTime[];
	currentIndex: number;
	setIndex: (index: number) => void;
	trigger: ReactNode;
}
export function HistoryDialog({
	history,
	currentIndex,
	setIndex,
	trigger,
}: Props) {
	return (
		<Dialog>
			<DialogTrigger asChild>{trigger}</DialogTrigger>

			<DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>History</DialogTitle>
				</DialogHeader>

				<DialogDescription>
					The history is limited to the last <b>20</b> entries.
				</DialogDescription>

				<div className="flex flex-col gap-2 overflow-auto">
					{history.map((response, index) => (
						<HistoryItem
							// biome-ignore lint/suspicious/noArrayIndexKey: 現状履歴削除などはなく、すべてリレンダリングされるため関係ない
							key={index}
							index={index}
							response={response}
							setIndex={setIndex}
							isCurrent={index === currentIndex}
						/>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

interface HistoryItemProps {
	index: number;
	response: ResponseWithTime;
	setIndex: (index: number) => void;
	isCurrent: boolean;
}
function HistoryItem({
	index,
	response,
	setIndex,
	isCurrent,
}: HistoryItemProps) {
	const onClick = useCallback(() => {
		setIndex(index);
	}, [setIndex, index]);

	return (
		<button
			type="button"
			onClick={onClick}
			className="group cursor-pointer text-left"
		>
			<Card
				className={cn(
					"cursor-pointer transition-colors",
					isCurrent ? "bg-accent" : "group-[:hover]:bg-accent",
				)}
			>
				<CardHeader>
					<CardTitle>
						<time dateTime={formatISO(response.time)}>
							{formatISO9075(response.time)}
						</time>
					</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-[1fr,auto,1fr] gap-2">
					<p className="line-clamp-3 break-words">
						{response.detected_language === "ja" ? response.ja : response.en}
					</p>
					<div className="bg-border w-px h-[100%+8px] -my-1" />
					<p className="line-clamp-3 break-words">
						{response.detected_language === "ja" ? response.en : response.ja}
					</p>
				</CardContent>
			</Card>
		</button>
	);
}
