import { type as osType } from "@tauri-apps/plugin-os";

export function isMacOs() {
	return osType() === "macos";
}
export function isWindows() {
	return osType() === "windows";
}
