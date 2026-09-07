# @chat-js/cli

CLI to scaffold and extend ChatJS apps.

## Usage

```bash
npx @chat-js/cli@latest
```

Or with the command alias:

```bash
npx @chat-js/cli@latest create
```

After install, the binary is:

- `chat-js`

Choose the existing app's gateway interactively, or pass a built-in name,
external registry item URL, or local JSON path:

```sh
chat-js create my-chat --gateway vercel
chat-js create my-chat --gateway https://example.com/r/acme-gateway.json
chat-js create my-chat --gateway ./acme-gateway.json
```

The CLI installs only that item's adapter files and declared dependencies.
`@chat-js/gateways` supplies shared contracts and utilities, with no gateway
implementations. Third-party items declare their own ID, defaults, capabilities,
and credentials; the CLI has no fixed gateway enum. See
[gateway authoring](../registry/gateways/README.md) for the version 1 contract.

Run `bun --filter @chat-js/cli test:gateways` from the repository root to verify
independent installs of all built-ins and an external registry gateway.
