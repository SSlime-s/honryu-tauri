import type { Response } from "@/features/translate/schema";
import { useCallback, useMemo, useState } from "react";

interface HistoryManager {
	current: Response;
	hasPrev: boolean;
	hasNext: boolean;
	prev: () => void;
	next: () => void;
}

export function useHistory(history: readonly Response[]): HistoryManager {
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

	return { current, hasPrev, hasNext, prev, next };
}
