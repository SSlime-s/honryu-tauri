import {
	responseSchema,
	responseWithTimeSchema,
	type ResponseWithTime,
} from "@/features/translate/schema";
import { load, type Store } from "@tauri-apps/plugin-store";
import { useCallback, useEffect, useState } from "react";
import * as v from "valibot";

const HISTORY_FILE_NAME = "history.json";
const HISTORY_KEY = "history";
const HISTORY_MAX_SIZE = 20;

const savedHistorySchema = v.intersect([
	responseSchema,
	v.pipe(
		v.object({ time: v.pipe(v.string(), v.isoTimestamp()) }),
		v.transform(({ time }) => {
			return {
				time: new Date(time),
			};
		}),
	),
]);
const toSaveHistorySchema = v.pipe(
	responseWithTimeSchema,
	v.transform(({ time, ...rest }) => {
		return {
			...rest,
			time: time.toISOString(),
		};
	}),
);

interface EternalHistory {
	history: ResponseWithTime[];
	push: (response: ResponseWithTime) => void;
}
/**
 * HISTORY_FILE_NAME と HISTORY_KEY で指定されたファイルから履歴を読み込み、保存する
 */
export function useEternalHistory(): EternalHistory {
	const [history, setHistory] = useState<ResponseWithTime[]>([]);
	const [store, setStore] = useState<Store | null>(null);

	useEffect(() => {
		(async () => {
			setStore(await load(HISTORY_FILE_NAME, { autoSave: true }));
		})();
	}, []);

	useEffect(() => {
		(async () => {
			if (store === null) {
				return;
			}

			const history = await store.get(HISTORY_KEY);
			const result = v.safeParse(v.array(savedHistorySchema), history);

			if (result.success) {
				setHistory(result.output);
			}
		})();
	}, [store]);

	const push = useCallback(
		async (response: ResponseWithTime) => {
			const nextHistory = [response, ...history].slice(0, HISTORY_MAX_SIZE);

			setHistory(nextHistory);
			if (store === null) {
				return;
			}
			const toSave = v.safeParse(v.array(toSaveHistorySchema), nextHistory);
			if (!toSave.success) {
				throw new Error(`failed to parse history: ${toSave.issues}`);
			}
			await store.set(HISTORY_KEY, toSave.output);
		},
		[history, store],
	);

	return {
		history,
		push,
	};
}
