import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create } from "./create";

const tempDirs: string[] = [];

function makeTempDir(name: string): string {
  const dir = join(tmpdir(), `chat-js-create-${name}-${crypto.randomUUID()}`);
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

describe("create command", () => {
  it("ships the selected Files SDK provider without unrelated provider peers", async () => {
    const tempParent = makeTempDir("s3-app");
    const appName = "s3-chat-app";
    const originalCwd = process.cwd();

    await mkdir(tempParent, { recursive: true });
    process.chdir(tempParent);
    try {
      await create.parseAsync(
        [
          appName,
          "--yes",
          "--no-install",
          "--storage-provider",
          "s3",
          "--storage-config",
          '{"bucket":"uploads","region":"us-east-1"}',
        ],
        { from: "user" }
      );
    } finally {
      process.chdir(originalCwd);
    }

    const packageJson = JSON.parse(
      await readFile(join(tempParent, appName, "package.json"), "utf8")
    ) as { dependencies: Record<string, string> };
    const provider = await readFile(
      join(tempParent, appName, "lib", "storage-provider.ts"),
      "utf8"
    );

    expect(packageJson.dependencies["@aws-sdk/client-s3"]).toBe("^3.700.0");
    expect(packageJson.dependencies["@vercel/blob"]).toBeUndefined();
    expect(provider).toContain('from "files-sdk/s3"');
  });

  it("uses the explicitly requested package manager for scaffold defaults", async () => {
    const tempParent = makeTempDir("npm-app");
    const appName = "my-chat-app";
    const originalCwd = process.cwd();

    await mkdir(tempParent, { recursive: true });
    process.chdir(tempParent);
    try {
      await create.parseAsync(
        [appName, "--yes", "--no-install", "--package-manager", "npm"],
        {
          from: "user",
        }
      );
    } finally {
      process.chdir(originalCwd);
    }

    const packageJson = JSON.parse(
      await readFile(join(tempParent, appName, "package.json"), "utf8")
    ) as {
      packageManager?: string;
      overrides?: Record<string, string>;
    };

    expect(packageJson.packageManager).toBeUndefined();
    expect(
      (packageJson as { dependencies?: Record<string, string> }).dependencies?.[
        "@vercel/blob"
      ]
    ).toBeUndefined();
    expect(packageJson.overrides?.["@better-auth/core"]).toBe("1.5.6");
  });

  it("treats storage config as an explicit storage request", async () => {
    const tempParent = makeTempDir("storage-config-app");
    const appName = "storage-config-chat-app";
    const originalCwd = process.cwd();

    await mkdir(tempParent, { recursive: true });
    process.chdir(tempParent);
    try {
      await create.parseAsync(
        [appName, "--yes", "--no-install", "--storage-config", "{}"],
        { from: "user" }
      );
    } finally {
      process.chdir(originalCwd);
    }

    const provider = await readFile(
      join(tempParent, appName, "lib", "storage-provider.ts"),
      "utf8"
    );
    expect(provider).toContain('from "files-sdk/vercel-blob"');
  });
});

it("leaves non-ChatJS Git templates unconfigured through the full create command", async () => {
	const { writeFile } = await import("node:fs/promises");
	const source = makeTempDir("plain-source");
	const destination = makeTempDir("plain-clone");
	await mkdir(source, { recursive: true });
	const manifest = JSON.stringify({ name: "plain-app", dependencies: {} });
	await writeFile(join(source, "package.json"), manifest);
	for (const args of [
		["init"],
		["add", "."],
		[
			"-c",
			"user.name=ChatJS Test",
			"-c",
			"user.email=test@chatjs.dev",
			"commit",
			"-m",
			"initial",
		],
	]) {
		expect(Bun.spawnSync(["git", ...args], { cwd: source }).exitCode).toBe(0);
	}
	await create.parseAsync(
		[
			destination,
			"--from-git",
			source,
			"--gateway",
			"vercel",
			"--yes",
			"--no-install",
		],
		{ from: "user" },
	);
	expect(await Bun.file(join(destination, "chat.config.ts")).exists()).toBe(
		false,
	);
	expect(await readFile(join(destination, "package.json"), "utf8")).toBe(
		manifest,
	);
});
