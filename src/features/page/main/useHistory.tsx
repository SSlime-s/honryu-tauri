import type { ResponseWithTime } from "@/features/translate/schema";
import { useCallback, useMemo, useState } from "react";

interface HistoryManager {
	history: readonly ResponseWithTime[];
	current: ResponseWithTime;
	currentIndex: number;
	hasPrev: boolean;
	hasNext: boolean;
	prev: () => void;
	next: () => void;
	setIndex: (index: number) => void;
}

export function useHistory(
	history: readonly ResponseWithTime[],
): HistoryManager {
	const [index, setIndex] = useState(0);

	const hasPrev = index < history.length - 1;
	const hasNext = index > 0;

	const current = useMemo(() => history[index], [history, index]);

	const prev = useCallback(() => {
		if (hasPrev) {
			setIndex((prev) => prev + 1);
		}
	}, [hasPrev]);

	const next = useCallback(() => {
		if (hasNext) {
			setIndex((prev) => prev - 1);
		}
	}, [hasNext]);

	const setIndexWrapped = useCallback(
		(index: number) => {
			if (index >= 0 && index < history.length) {
				setIndex(index);
			}
		},
		[history],
	);

	return {
		history,
		current,
		currentIndex: index,
		hasPrev,
		hasNext,
		prev,
		next,
		setIndex: setIndexWrapped,
	};
}
