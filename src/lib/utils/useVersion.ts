import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

export function useVersion() {
	const [version, setVersion] = useState<string | null>(null);

	useEffect(() => {
		getVersion().then(setVersion);
	}, []);

	return version;
}
