# @chat-js/registry

## 1.0.0

### Major Changes

- [#346](https://github.com/FranciscoMoretti/chat-js/pull/346) [`2962417`](https://github.com/FranciscoMoretti/chat-js/commit/296241729e7235be9e91149f37f79b7dfb678fb7) Thanks [@FranciscoMoretti](https://github.com/FranciscoMoretti)! - Build standard registry JSON from tested TypeScript sources using shadcn. Use
  shadcn for gateway/tool installation and generate typed registrations from local
  tool descriptors. Add `chat-js sync` and separate custom registration modules.

  Registry v1 publishes `dist/r/`; historical v0 npm artifacts keep their legacy
  format. Publish registry v1 and gateway contracts before promoting the CLI.
  Remove `--registry`, `--no-install`, `--package-manager`, and `paths.tools` in
  favor of standard namespaces, immediate installation, package-manager detection,
  and explicit registry targets. Known legacy built-in registrations migrate on sync.

### Minor Changes

- [#332](https://github.com/FranciscoMoretti/chat-js/pull/332) [`5b6664e`](https://github.com/FranciscoMoretti/chat-js/commit/5b6664e7b846851228605933160281b07a4b0ce2) Thanks [@FranciscoMoretti](https://github.com/FranciscoMoretti)! - Select AI gateways during ChatJS creation through shadcn-format registry items,
  including external registry URLs. Install only the selected adapter source and
  its declared dependencies. Keep shared contracts and runtime utilities in
  @chat-js/gateways, and validate configuration against the installed adapter.

## 0.1.2

### Patch Changes

- [#180](https://github.com/FranciscoMoretti/chat-js/pull/180) [`eee3cdc`](https://github.com/FranciscoMoretti/chat-js/commit/eee3cdcf32c89129d895774cfed420914c058214) Thanks [@FranciscoMoretti](https://github.com/FranciscoMoretti)! - Unify package releases around Changesets by removing the dedicated registry
  deploy workflow and switching the CLI's default registry source to the
  published `@chat-js/registry` package on npm.

## 0.1.1

### Patch Changes

- [#159](https://github.com/FranciscoMoretti/chat-js/pull/159) [`a507edd`](https://github.com/FranciscoMoretti/chat-js/commit/a507edd5e6678cadc5b73937d3c5baac49af246e) Thanks [@FranciscoMoretti](https://github.com/FranciscoMoretti)! - Publish `@chat-js/registry` as a public package and expose its generated registry artifacts plus shared tool env requirement types.

- Test patch release generation across all releasable packages.
