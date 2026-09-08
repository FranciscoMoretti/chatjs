import { afterEach, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gatewayMetadata } from "../../../registry/gateways/metadata";
import gatewayPackage from "@chat-js/gateways/package.json";
import { GATEWAYS } from "../types";
import { configureGatewayProvider } from "./gateway-provider";
import { scaffoldFromTemplate } from "./scaffold";

const directories: string[] = [];
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

it("scaffolds every gateway with matching imports and only its direct SDK dependency", async () => {
	for (const gateway of GATEWAYS) {
		const directory = await mkdtemp(join(tmpdir(), "chatjs-gateway-"));
		directories.push(directory);
		await scaffoldFromTemplate(directory, { gateway });
		const manifest = await Bun.file(join(directory, "package.json")).json();
		const selected = gatewayMetadata[gateway];
		expect(manifest.dependencies["@chat-js/gateways"]).toBe(
			gatewayPackage.version,
		);
		for (const { dependency } of Object.values(gatewayMetadata)) {
			expect(manifest.dependencies[dependency]).toBe(
				dependency === selected.dependency ? selected.version : undefined,
			);
		}
		expect(
			await readFile(join(directory, "lib/ai/gateway.ts"), "utf8"),
		).toContain(`export { ${selected.exportName} as Gateway }`);
		expect(
			await readFile(
				join(directory, "lib/ai/gateway-model-defaults.ts"),
				"utf8",
			),
		).toContain(`gatewayType = "${gateway}"`);
		expect(
			await Bun.file(
				join(directory, "lib/ai/gateways/openai-gateway.ts"),
			).exists(),
		).toBe(false);
	}
});

it("replaces the owned gateway dependency while preserving unrelated dependencies", async () => {
	const directory = await mkdtemp(join(tmpdir(), "chatjs-gateway-switch-"));
	directories.push(directory);
	await scaffoldFromTemplate(directory, { gateway: "openai" });
	const path = join(directory, "package.json");
	const manifest = await Bun.file(path).json();
	manifest.dependencies["user-sdk"] = "1.0.0";
	await writeFile(path, JSON.stringify(manifest));
	await configureGatewayProvider(directory, "litellm");
	const updated = await Bun.file(path).json();
	expect(updated.dependencies["@ai-sdk/openai"]).toBeUndefined();
	expect(updated.dependencies["@ai-sdk/openai-compatible"]).toBe("3.0.44");
	expect(updated.dependencies["user-sdk"]).toBe("1.0.0");
});

it("installs an external registry dependency graph and its own environment requirements", async () => {
	const { externalGatewayFixture } = await import(
		"../../test/external-gateway"
	);
	const { resolveGateway } = await import("../registry/gateways");
	const fixture = externalGatewayFixture();
	const directory = await mkdtemp(join(tmpdir(), "chatjs-external-"));
	directories.push(directory);
	await scaffoldFromTemplate(directory);
	const source = join(directory, "external.json");
	await writeFile(source, JSON.stringify(fixture.root));
	await writeFile(
		join(directory, "adapter.json"),
		JSON.stringify(fixture.adapter),
	);
	await configureGatewayProvider(directory, await resolveGateway(source));
	const manifest = await Bun.file(join(directory, "package.json")).json();
	expect(manifest.dependencies["@ai-sdk/gateway"]).toBeUndefined();
	expect(manifest.dependencies["@ai-sdk/openai-compatible"]).toBe("3.0.44");
	expect(
		await readFile(join(directory, "lib/ai/gateway/adapter.ts"), "utf8"),
	).toContain('readonly type = "acme"');
	expect(await readFile(join(directory, ".env.example"), "utf8")).toContain(
		"ACME_API_KEY=",
	);
});

it("rejects incompatible contracts, cycles and unsafe or conflicting files before changing an app", async () => {
	const { externalGatewayFixture } = await import(
		"../../test/external-gateway"
	);
	const { resolveGateway } = await import("../registry/gateways");
	const fixture = externalGatewayFixture();
	const directory = await mkdtemp(join(tmpdir(), "chatjs-invalid-gateway-"));
	directories.push(directory);
	await scaffoldFromTemplate(directory);
	const source = join(directory, "external.json");
	const adapterPath = join(directory, "adapter.json");
	const original = await readFile(join(directory, "lib/ai/gateway.ts"), "utf8");
	await writeFile(
		source,
		JSON.stringify({
			...fixture.root,
			meta: { chatjs: { ...fixture.root.meta.chatjs, contractVersion: 2 } },
		}),
	);
	await expect(resolveGateway(source)).rejects.toThrow();
	await writeFile(source, JSON.stringify(fixture.root));
	await writeFile(
		adapterPath,
		JSON.stringify({
			...fixture.adapter,
			registryDependencies: ["./external.json"],
		}),
	);
	await expect(resolveGateway(source)).rejects.toThrow("Circular");
	for (const target of [
		"~/../outside.ts",
		"~/lib/ai/gateway/../../outside.ts",
		"~/lib/ai/gateway.ts",
	]) {
		await writeFile(
			adapterPath,
			JSON.stringify({
				...fixture.adapter,
				files: [{ ...fixture.adapter.files[0], target }],
			}),
		);
		const selection = await resolveGateway(source);
		await expect(
			configureGatewayProvider(directory, selection),
		).rejects.toThrow();
		expect(await readFile(join(directory, "lib/ai/gateway.ts"), "utf8")).toBe(
			original,
		);
	}
});

it("rejects symlinked fixed outputs and missing snapshots before modifying the adapter", async () => {
	const { symlink } = await import("node:fs/promises");
	const directory = await mkdtemp(join(tmpdir(), "chatjs-preflight-"));
	directories.push(directory);
	await scaffoldFromTemplate(directory);
	const gateway = join(directory, "lib/ai/gateway.ts");
	const original = await readFile(gateway, "utf8");
	for (const target of [
		"package.json",
		".env.example",
		"lib/ai/models.generated.ts",
		"lib/ai/gateway-model-defaults.ts",
	]) {
		const path = join(directory, target);
		const content = await readFile(path, "utf8");
		const outside = join(directory, "sentinel");
		await writeFile(outside, content);
		await rm(path);
		await symlink(outside, path);
		await expect(configureGatewayProvider(directory, "openai")).rejects.toThrow(
			"symlink",
		);
		expect(await readFile(gateway, "utf8")).toBe(original);
		expect(await readFile(outside, "utf8")).toBe(content);
		await rm(path);
		await writeFile(path, content);
	}
	await rm(join(directory, "lib/ai/models.generated.ts"));
	await expect(configureGatewayProvider(directory, "openai")).rejects.toThrow();
	expect(await readFile(gateway, "utf8")).toBe(original);
});
