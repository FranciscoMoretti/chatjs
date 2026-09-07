# Gateway registry

Gateway items use the shadcn `registry-item.json` format. ChatJS reads
`meta.chatjs` to select the adapter and configure the existing app during creation.
The ChatJS CLI performs this activation; running shadcn's file installer alone
does not configure `chat.config.ts`.

```sh
chat-js create my-chat --gateway vercel
chat-js create my-chat --gateway https://example.com/r/acme-gateway.json
chat-js create my-chat --gateway ./acme-gateway.json
```

Without `--gateway`, the interactive CLI offers the bundled gateway items.
`--yes` selects Vercel. A named item can also be resolved with
`--gateway acme --registry 'https://example.com/r/{name}.json'`.

Run `bun --filter @chat-js/registry build` to generate the built-in
`items/*-gateway.json` payloads and the standard `gateways.json` registry index.
The CLI bundles those same item definitions for offline built-in scaffolding.

## Author an item

Use a built item as a starting point. Declare:

- `type: "registry:item"`, a name, and `files` with source `content`.
- `dependencies` / `devDependencies`: npm names with optional versions.
- `registryDependencies`: URLs or local paths to supporting registry items.
  Relative addresses resolve against the declaring item's location.
- A file targeting `~/lib/ai/gateway.ts`, exporting a `Gateway` constructor.
  Supporting files live under `~/lib/ai/gateway/`.
- `meta.chatjs`: `kind: "gateway"`, `contractVersion: 1`, a unique literal `id`,
  `capabilities: { image, video }`, `defaults`, and `envRequirements`.

Each environment requirement has `options: string[][]`: outer entries are
alternatives, and every variable within one alternative is required. Separate
requirements must all be satisfied. `optionalEnv` declares optional variables
that the adapter also needs. The app passes only these declared variables to it.

`defaults` contains provider order, model lists, workflow models and tool defaults;
its complete validated shape is exported as `GatewayDefinition` from
`@chat-js/gateways/definition`. The installer writes selected defaults with
`satisfies GatewayModelDefaults<InstanceType<typeof Gateway>>` so the generated
app checks them against the actual adapter, not a list of known gateway names.

An item can instead install a tiny entry file importing `Gateway` from an author's
npm package and list that package in `dependencies`. No ChatJS CLI change is
needed for a new gateway ID. Registry dependencies may contain supporting files,
but cannot select another gateway. Conflicting files, dependency versions,
unsupported contract versions and paths outside the gateway slot are rejected.

The registry supplies files and dependencies; it does not execute installation
hooks. Standard package-manager behavior still applies when dependencies install.

## Verify

Type-check an independently installed generated app, including its generated
config. Test model creation and discovery through `GatewayProvider` with injected
fixtures. The integration suite in `packages/cli/test/gateway-selection.test.ts`
uses an HTTP registry with an unknown `acme` gateway and a separate adapter item.
No paid provider credentials are required for these tests.
