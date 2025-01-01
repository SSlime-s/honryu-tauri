import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useId } from "react";

interface Props {
	label: string;
	content: string;
	isDetected?: boolean;
}
export function TextBlock({ label, content, isDetected }: Props) {
	const id = useId();

	return (
		<div className="h-full flex flex-col gap-1">
			<Label>
				{label}{" "}
				{isDetected && (
					<Badge variant="secondary" className="ml-2">
						Detected
					</Badge>
				)}
			</Label>
			<Textarea id={id} value={content} readOnly className="h-full" />
		</div>
	);
}

export function TextBlockSkeleton() {
	return (
		<div className="h-full flex flex-col gap-1">
			<Skeleton className="h-4 w-[10ch]" />
			<Textarea value="" readOnly className="h-full" />
		</div>
	);
}
