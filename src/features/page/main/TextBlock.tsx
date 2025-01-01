import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useId } from "react";

interface Props {
	label: string;
	content: string;
}
export function TextBlock({ label, content }: Props) {
	const id = useId();

	return (
		<div className="h-full flex flex-col gap-1">
			<Label>{label}</Label>
			<Textarea id={id} value={content} readOnly />
		</div>
	);
}

export function TextBlockSkeleton() {
  return (
    <div className="h-full flex flex-col gap-1">
      <Skeleton className="h-4 w-[10ch]"/>
      <Textarea value="" readOnly />
    </div>
  );
}
