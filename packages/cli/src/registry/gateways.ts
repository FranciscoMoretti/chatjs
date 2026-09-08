import { dirname, isAbsolute, resolve } from "node:path";
import { gatewayDefinitionSchema } from "@chat-js/gateways/definition";
import { z } from "zod";
import { builtInGateways } from "../../../registry/gateways/catalog";
import { fetchJson } from "./fetch";

export { builtInGateways };
const itemSchema = z.object({
	name: z.string().min(1),
	type: z.enum(["registry:item", "registry:lib", "registry:file"]),
	dependencies: z.array(z.string()).default([]),
	devDependencies: z.array(z.string()).default([]),
	registryDependencies: z.array(z.string()).default([]),
	files: z
		.array(
			z.object({
				path: z.string(),
				type: z.enum(["registry:file", "registry:lib"]),
				target: z.string(),
				content: z.string(),
			}),
		)
		.default([]),
	meta: z.object({ chatjs: gatewayDefinitionSchema.optional() }).optional(),
});
export type GatewayRegistryItem = z.infer<typeof itemSchema>;
export interface GatewaySelection {
	definition: z.infer<typeof gatewayDefinitionSchema>;
	items: GatewayRegistryItem[];
	source: string;
}

/** Resolve declarative registry data without evaluating third-party adapter code. */
export async function resolveGateway(
	source: string,
	registry?: string,
): Promise<GatewaySelection> {
	const items: GatewayRegistryItem[] = [];
	const visited = new Map<string, GatewayRegistryItem>();
	const visiting = new Set<string>();
	function address(name: string, parent?: string): string {
		if (/^https?:\/\//i.test(name) || isAbsolute(name)) return name;
		if (name.startsWith(".") || name.endsWith(".json")) {
			return parent && /^https?:\/\//i.test(parent)
				? new URL(name, parent).href
				: resolve(parent ? dirname(parent) : process.cwd(), name);
		}
		if (registry) return registry.replace("{name}", encodeURIComponent(name));
		if (parent && !parent.startsWith("builtin:")) {
			return /^https?:\/\//i.test(parent)
				? new URL(`${name}.json`, parent).href
				: resolve(dirname(parent), `${name}.json`);
		}
		return `builtin:${name}`;
	}
	async function visit(location: string): Promise<GatewayRegistryItem> {
		if (visiting.has(location))
			throw new Error(`Circular gateway registry dependency: ${location}`);
		const cached = visited.get(location);
		if (cached) return cached;
		visiting.add(location);
		const raw = location.startsWith("builtin:")
			? builtInGateways.find(
					(item) =>
						item.name === location.slice(8) ||
						item.meta.chatjs.id === location.slice(8),
				)
			: await fetchJson(location, { secureTransport: true });
		if (!raw)
			throw new Error(
				`Unknown gateway "${location.slice(8)}". Use a built-in name, registry URL, or local JSON path.`,
			);
		const item = itemSchema.parse(raw);
		for (const dependency of item.registryDependencies)
			await visit(address(dependency, location));
		visiting.delete(location);
		visited.set(location, item);
		items.push(item);
		return item;
	}
	const location = address(source);
	const selected = await visit(location);
	const definition = selected.meta?.chatjs;
	if (selected.type !== "registry:item")
		throw new Error("Selected gateway root must have type registry:item.");
	if (!definition)
		throw new Error(
			"Selected registry item must declare meta.chatjs with a version 1 gateway contract.",
		);
	if (items.some((item) => item !== selected && item.meta?.chatjs))
		throw new Error(
			"A gateway item cannot install another gateway as a dependency.",
		);
	return { source: location, definition, items };
}
