import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { builtInGateways } from "./gateways/catalog";

const directory = new URL("./items/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const name of await readdir(directory)) {
  if (name.endsWith("-gateway.json")) await rm(new URL(name, directory));
}
for (const item of builtInGateways) {
  await writeFile(
    new URL(`${item.name}.json`, directory),
    `${JSON.stringify(item, null, 2)}\n`,
  );
}
await writeFile(
  new URL("./gateways.json", import.meta.url),
  `${JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "chatjs-gateways",
      homepage: "https://chatjs.dev",
      items: builtInGateways,
    },
    null,
    2,
  )}\n`,
);
