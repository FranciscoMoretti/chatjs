import fs from "node:fs";
import path from "node:path";
import type { PackageManager } from "../types";

export function inferPackageManager(cwd = process.cwd()): PackageManager {
	let currentDir = path.resolve(cwd);
	while (true) {
		const manifestPath = path.join(currentDir, "package.json");
		if (fs.existsSync(manifestPath)) {
			const declared = JSON.parse(
				fs.readFileSync(manifestPath, "utf8"),
			).packageManager?.split("@")[0];
			if (["bun", "npm", "pnpm", "yarn"].includes(declared)) return declared;
		}
		if (fs.existsSync(path.join(currentDir, "pnpm-lock.yaml"))) return "pnpm";
		if (fs.existsSync(path.join(currentDir, "yarn.lock"))) return "yarn";
		if (fs.existsSync(path.join(currentDir, "package-lock.json"))) return "npm";
		if (
			fs.existsSync(path.join(currentDir, "bun.lock")) ||
			fs.existsSync(path.join(currentDir, "bun.lockb"))
		) {
			return "bun";
		}

		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) {
			break;
		}
		currentDir = parentDir;
	}

	return launcherPackageManager();
}

export function launcherPackageManager(): PackageManager {
	const ua = process.env.npm_config_user_agent ?? "";
	if (ua.startsWith("pnpm/")) return "pnpm";
	if (ua.startsWith("yarn/")) return "yarn";
	if (ua.startsWith("npm/")) return "npm";
	if (ua.startsWith("bun/")) return "bun";

	return "bun";
}
