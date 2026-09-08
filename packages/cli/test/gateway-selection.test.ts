import { run } from "./run-command";
import { afterAll, beforeAll, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gatewayMetadata } from "../../registry/gateways/metadata";
import gatewayPackage from "@chat-js/gateways/package.json";
import { externalGatewayFixture } from "./external-gateway";
import { GATEWAYS } from "../src/types";

const root = await mkdtemp(join(tmpdir(), "chatjs-gateway-integration-"));
const packageDirectory = dirname(
	fileURLToPath(import.meta.resolve("@chat-js/gateways/package.json")),
);
const cliDirectory = join(import.meta.dir, "..");
const cliEntry = join(cliDirectory, "dist", "index.js");
const archive = join(root, `chat-js-gateways-${gatewayPackage.version}.tgz`);

beforeAll(async () => {
	await run(packageDirectory, ["bun", "run", "build"]);
	await run(packageDirectory, ["bun", "pm", "pack", "--destination", root]);
	await run(cliDirectory, ["bun", "run", "build"]);
});

afterAll(async () => {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			rm(root, { recursive: true, force: true }),
			new Promise<never>((_, reject) => {
				timeout = setTimeout(
					() => reject(new Error("Gateway test cleanup timed out")),
					180_000,
				);
			}),
		]);
	} finally {
		clearTimeout(timeout);
	}
});

const external = externalGatewayFixture();
const registryServer = Bun.serve({
	port: 0,
	hostname: "127.0.0.1",
	async fetch(request) {
		const path = new URL(request.url).pathname;
		if (path === "/gateway.json") return Response.json(external.root);
		if (path === "/adapter.json") return Response.json(external.adapter);
		if (path === "/v1/chat/completions") {
			if (request.headers.get("authorization") !== "Bearer fixture-key")
				return new Response("Unauthorized", { status: 401 });
			const body = await request.json();
			if (body.model !== "gpt-5-mini")
				return new Response("Wrong model", { status: 400 });
			return Response.json({
				id: "fixture-response",
				object: "chat.completion",
				created: 1,
				model: body.model,
				choices: [
					{
						index: 0,
						message: { role: "assistant", content: "External gateway works." },
						finish_reason: "stop",
					},
				],
				usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
			});
		}
		return new Response("Not found", { status: 404 });
	},
});
afterAll(() => registryServer.stop(true));

for (const gateway of [...GATEWAYS, "acme"]) {
	it(`${gateway}: independently installed ChatJS app typechecks and loads the registry adapter`, async () => {
		const cwd = join(root, gateway);
		await run(root, [
			"node",
			cliEntry,
			"create",
			gateway,
			"--gateway",
			gateway === "acme"
				? `http://127.0.0.1:${registryServer.port}/gateway.json`
				: gateway,
			"--yes",
			"--no-install",
			"--no-electron",
			"--package-manager",
			"bun",
		]);
		const manifestPath = join(cwd, "package.json");
		const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
		manifest.dependencies[gatewayPackage.name] = `file:${archive}`;
		await writeFile(manifestPath, JSON.stringify(manifest));
		await run(cwd, ["bun", "install", "--ignore-scripts"]);
		const selectedSdk =
			gateway === "acme"
				? "@ai-sdk/openai-compatible"
				: gatewayMetadata[gateway as keyof typeof gatewayMetadata].dependency;
		for (const { dependency } of Object.values(gatewayMetadata)) {
			if (dependency !== selectedSdk)
				expect(manifest.dependencies[dependency]).toBeUndefined();
		}
		// The shared npm archive must not carry any other adapter implementations.
		for (const name of GATEWAYS) {
			expect(
				await Bun.file(
					join(cwd, "node_modules/@chat-js/gateways/src", `${name}.ts`),
				).exists(),
			).toBe(false);
			expect(
				await Bun.file(
					join(cwd, "node_modules/@chat-js/gateways/dist", `${name}.js`),
				).exists(),
			).toBe(false);
		}

		const other = gateway === "vercel" ? "openai" : "vercel";
		await writeFile(
			join(cwd, "gateway-type-check.ts"),
			`import { defineConfig } from "./lib/config-schema";
// @ts-expect-error An uninstalled gateway must not typecheck.
defineConfig({ ai: { gateway: "${other}" } });
${
	gateway === "vercel" || gateway === "openai"
		? `// @ts-expect-error Preserve the selected SDK's model ID type across package declarations.
defineConfig({ ai: { gateway: "${gateway}", workflows: { chat: "not-a-model" } } });`
		: ""
}
${
	gateway === "vercel"
		? ""
		: `// @ts-expect-error This gateway cannot enable video generation.
defineConfig({ ai: { gateway: "${gateway}", tools: { video: { enabled: true, default: "video" } } } });`
}
`,
		);
		await run(cwd, ["bun", "run", "test:types"]);
		await writeFile(
			join(cwd, "probe.ts"),
			`import { Gateway } from "./lib/ai/gateway";
import assert from "node:assert/strict";
assert.equal(new Gateway().type, "${gateway}");
`,
		);
		await run(cwd, ["bunx", "--no-install", "tsx", "probe.ts"]);

		if (gateway === "acme") {
			await writeFile(
				join(cwd, "probe-generation.ts"),
				`import assert from "node:assert/strict";
import { generateText } from "ai";
process.env.DATABASE_URL = "postgres://fixture:fixture@127.0.0.1/fixture";
process.env.AUTH_SECRET = "fixture-secret";
process.env.ACME_BASE_URL = "http://127.0.0.1:${registryServer.port}/v1";
process.env.ACME_API_KEY = "fixture-key";
const { getActiveGateway } = await import("./lib/ai/active-gateway");
const result = await generateText({ model: getActiveGateway().createLanguageModel("gpt-5-mini"), prompt: "Hello" });
assert.equal(result.text, "External gateway works.");
`,
			);
			await run(cwd, ["bunx", "--no-install", "tsx", "probe-generation.ts"]);
		}

		// Parse the actual generated config, including model defaults, without provider calls.
		await writeFile(
			join(cwd, "probe-config.ts"),
			`import { getProvider } from "files-sdk/providers";
import config from "./chat.config";
import { applyDefaults, aiConfigSchema } from "./lib/config-schema";
import assert from "node:assert/strict";
assert.ok(getProvider("vercel-blob"));
assert.equal(applyDefaults(config).ai.gateway, "${gateway}");
assert.equal(aiConfigSchema.safeParse({ ...applyDefaults(config).ai, gateway: "${other}" }).success, false);
${
	gateway === "vercel"
		? ""
		: `const ai = applyDefaults(config).ai;
assert.equal(aiConfigSchema.safeParse({ ...ai, tools: { ...ai.tools, video: { enabled: true, default: "video" } } }).success, false);`
}

`,
		);
		await run(cwd, ["bunx", "--no-install", "tsx", "probe-config.ts"]);
		expect(
			await Bun.file(
				join(cwd, "lib/ai/gateways/openrouter-gateway.ts"),
			).exists(),
		).toBe(false);
	}, 180_000);
}
