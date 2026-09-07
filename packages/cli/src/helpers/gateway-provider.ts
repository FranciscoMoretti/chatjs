import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { type GatewaySelection, resolveGateway } from "../registry/gateways";
import { isSafeTarget } from "../utils/is-safe-target";

const marker = "// ChatJS gateway dependencies: ";
const manifestSchema = z
	.object({
		dependencies: z.record(z.string(), z.string()),
		devDependencies: z.record(z.string(), z.string()).optional(),
	})
	.loose();

function parseDependency(value: string): [string, string] {
	const match = /^(@[a-z0-9._-]+\/[a-z0-9._-]+|[a-z0-9._-]+)(?:@(.+))?$/.exec(
		value,
	);
	if (!match) throw new Error(`Invalid npm dependency: ${value}`);
	return [match[1], match[2] ?? "latest"];
}

/** Registry files own only the gateway slot; application config is written separately. */
export async function configureGatewayProvider(
	destination: string,
	input: string | GatewaySelection,
): Promise<void> {
	const selection =
		typeof input === "string" ? await resolveGateway(input) : input;
	const files = new Map<string, string>();
	for (const item of selection.items) {
		for (const file of item.files) {
			const target = file.target.replace(/^~\//, "");
			if (
				!isSafeTarget(target, destination) ||
				!(
					target === "lib/ai/gateway.ts" || target.startsWith("lib/ai/gateway/")
				)
			) {
				throw new Error(
					`Gateway registry file must target lib/ai/gateway.ts or lib/ai/gateway/: ${file.target}`,
				);
			}
			if (files.has(target))
				throw new Error(`Conflicting gateway registry file: ${target}`);
			// Reject symlinks before any writes, including an existing parent directory.
			let path = destination;
			for (const part of target.split("/")) {
				path = join(path, part);
				const entry = await lstat(path).catch((error) => {
					if (error.code === "ENOENT") return null;
					throw error;
				});
				if (entry?.isSymbolicLink())
					throw new Error(`Gateway target contains a symlink: ${target}`);
			}
			files.set(target, file.content);
		}
	}
	if (!files.has("lib/ai/gateway.ts"))
		throw new Error(
			"Gateway registry item must install lib/ai/gateway.ts exporting Gateway.",
		);
	const dependencies: Record<string, string> = {};
	const devDependencies: Record<string, string> = {};
	for (const item of selection.items) {
		for (const [entries, target] of [
			[item.dependencies, dependencies],
			[item.devDependencies, devDependencies],
		] as const) {
			for (const entry of entries) {
				const [name, version] = parseDependency(entry);
				const previous = dependencies[name] ?? devDependencies[name];
				if (previous && previous !== version)
					throw new Error(
						`Conflicting gateway dependency versions for ${name}`,
					);
				target[name] = version;
			}
		}
	}
	const gatewayPath = join(destination, "lib/ai/gateway.ts");
	const current = await readFile(gatewayPath, "utf8");
	const manifestPath = join(destination, "package.json");
	const manifest = manifestSchema.parse(
		JSON.parse(await readFile(manifestPath, "utf8")),
	);
	const previousMarker = current
		.split("\n")
		.find((line) => line.startsWith(marker));
	const legacy = current
		.split("\n")
		.find((line) => line.startsWith("// ChatJS gateway dependency: "))
		?.slice("// ChatJS gateway dependency: ".length);
	const previous = previousMarker
		? z.array(z.string()).parse(JSON.parse(previousMarker.slice(marker.length)))
		: legacy
			? [legacy]
			: [];
	for (const name of previous) {
		delete manifest.dependencies[name];
		if (manifest.devDependencies) delete manifest.devDependencies[name];
	}
	Object.assign(manifest.dependencies, dependencies);
	manifest.devDependencies = {
		...manifest.devDependencies,
		...devDependencies,
	};
	// All validation precedes mutation.
	for (const [target, content] of files) {
		await mkdir(dirname(join(destination, target)), { recursive: true });
		await writeFile(
			join(destination, target),
			target === "lib/ai/gateway.ts"
				? `${marker}${JSON.stringify([...Object.keys(dependencies), ...Object.keys(devDependencies)])}\n${content}`
				: content,
		);
	}
	const { definition } = selection;
	await writeFile(
		join(destination, "lib/ai/gateway-model-defaults.ts"),
		`import type { GatewayModelDefaults } from "@chat-js/gateways/defaults";
import type { Gateway } from "./gateway";

export const gatewayType = ${JSON.stringify(definition.id)} satisfies InstanceType<typeof Gateway>["type"];
export const gatewayModelDefaults = ${JSON.stringify(definition.defaults, null, 2)} satisfies GatewayModelDefaults<InstanceType<typeof Gateway>>;
export const gatewayCapabilities = ${JSON.stringify(definition.capabilities)};
export const gatewayEnvRequirements = ${JSON.stringify(definition.envRequirements)};
export const gatewayEnvVariables = ${JSON.stringify([...new Set([...definition.envRequirements.flatMap((r) => r.options.flat()), ...definition.optionalEnv])])};
`,
	);
	const snapshotPath = join(destination, "lib/ai/models.generated.ts");
	const snapshot = await readFile(snapshotPath, "utf8");
	if (
		!snapshot.includes(`generatedForGateway = ${JSON.stringify(definition.id)}`)
	) {
		await writeFile(
			snapshotPath,
			`import type { AiGatewayModel } from "@chat-js/gateways/models";

export const generatedForGateway = ${JSON.stringify(definition.id)};
// Populate this gateway's catalog with the fetch:models script after setting credentials.
export const models: readonly AiGatewayModel[] = [];
`,
		);
	}
	const example = join(destination, ".env.example");
	let env = await readFile(example, "utf8").catch(() => "");
	for (const name of new Set(
		definition.envRequirements.flatMap((r) => r.options.flat()),
	)) {
		if (!new RegExp(`^${name}=`, "m").test(env)) env += `\n${name}=\n`;
	}
	await writeFile(example, env);
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
