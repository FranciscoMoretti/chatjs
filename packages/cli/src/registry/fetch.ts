import fs from "node:fs/promises";
import path from "node:path";
import {
	type RegistryIndexItem,
	type RegistryToolItem,
	registryIndexItemSchema,
	registryToolItemSchema,
} from "./schema";

export type {
	RegistryIndexItem,
	RegistryToolItem,
	RegistryToolItemFile,
} from "./schema";

export const DEFAULT_REGISTRY_URL =
	"https://unpkg.com/@chat-js/registry@0/items/{name}.json";

export function getRegistryUrl(override?: string): string {
	return override ?? process.env.CHATJS_REGISTRY_URL ?? DEFAULT_REGISTRY_URL;
}

function getRegistryIndexUrl(registryUrl?: string): string {
	const template = getRegistryUrl(registryUrl);
	if (template.includes("{name}")) {
		const itemTemplate = template.replace("{name}", "__name__");
		const isLocalPath = isLocalSource(template);
		if (isLocalPath && path.basename(path.dirname(itemTemplate)) === "items") {
			return path.join(path.dirname(path.dirname(itemTemplate)), "index.json");
		}
		if (!isLocalPath) {
			const itemUrl = new URL(itemTemplate);
			if (path.basename(path.dirname(itemUrl.pathname)) === "items") {
				return new URL("../index.json", itemUrl).toString();
			}
		}
		return template.replace(/(\{name\}\.json|\{name\})$/, "index.json");
	}

	if (isLocalSource(template)) {
		return path.join(path.dirname(template), "index.json");
	}

	return new URL("../index.json", template).toString();
}

function isLocalSource(source: string): boolean {
	return !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(source) || path.isAbsolute(source);
}

export async function fetchJson(
	source: string,
	options?: { secureTransport: boolean },
): Promise<unknown> {
	const isLocalPath = isLocalSource(source);
	const filePath = isLocalPath ? path.resolve(process.cwd(), source) : source;

	if (isLocalPath) {
		const content = await fs.readFile(filePath, "utf8").catch(() => {
			throw new Error(`Registry resource not found at ${filePath}`);
		});
		return JSON.parse(content);
	}

	let url = filePath;
	let res: Response;
	for (let redirects = 0; ; redirects++) {
		if (options?.secureTransport) {
			const parsed = new URL(url);
			if (
				parsed.protocol !== "https:" &&
				!(
					parsed.protocol === "http:" &&
					["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
				)
			)
				throw new Error(
					"Remote gateway registries must use HTTPS (HTTP is allowed only on loopback).",
				);
		}
		res = await fetch(url, { redirect: "manual" }).catch(() => {
			throw new Error(
				`Could not reach registry. Check your internet connection.`,
			);
		});

		if (![301, 302, 303, 307, 308].includes(res.status)) break;
		const location = res.headers.get("location");
		if (!location || redirects >= 10)
			throw new Error("Invalid or excessive registry redirects.");
		url = new URL(location, url).href;
	}

	if (res.status === 404) {
		throw new Error(`Registry resource not found: ${filePath}`);
	}
	if (!res.ok) {
		throw new Error(`Registry fetch failed: ${res.status} ${res.statusText}`);
	}

	return res.json();
}

export async function fetchRegistryIndex(
	registryUrl?: string,
): Promise<RegistryIndexItem[]> {
	const raw = await fetchJson(getRegistryIndexUrl(registryUrl));
	return registryIndexItemSchema.array().parse(raw);
}

export async function fetchRegistryItem(
	name: string,
	registryUrl?: string,
): Promise<RegistryToolItem> {
	const template = getRegistryUrl(registryUrl);
	const resolved = template.replace("{name}", encodeURIComponent(name));
	const raw = await fetchJson(resolved).catch((error: unknown) => {
		if (
			error instanceof Error &&
			error.message.startsWith("Registry resource not found")
		) {
			throw new Error(`Tool "${name}" not found in registry.`);
		}
		throw error;
	});

	return registryToolItemSchema.parse(raw);
}
