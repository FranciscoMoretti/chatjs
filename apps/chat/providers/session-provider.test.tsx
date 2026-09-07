// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth";
import { SessionProvider, SessionSeed, useSession } from "./session-provider";

const client = vi.hoisted(
  (): { data: Session | null; isPending: boolean; error: Error | null } => ({
    data: null,
    isPending: true,
    error: null,
  })
);
vi.mock("@/lib/auth-client", () => ({
  default: { useSession: () => client },
}));

function session(id: string): Session {
  return {
    user: {
      id,
      name: id,
      email: `${id}@example.test`,
      emailVerified: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
    session: {
      id: `session-${id}`,
      token: `test-${id}`,
      userId: id,
      expiresAt: new Date("2099-01-01"),
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
  };
}
function Consumer() {
  const current = useSession();
  return (
    <output>
      {JSON.stringify({
        user: current.data?.user.id ?? null,
        pending: current.isPending,
      })}
    </output>
  );
}
let root: Root;
let container: HTMLDivElement;
async function render(seed?: Session | null) {
  await act(() => {
    root.render(
      <SessionProvider>
        {seed !== undefined && <SessionSeed session={seed} />}
        <Consumer />
      </SessionProvider>
    );
  });
}
function shown() {
  return JSON.parse(container.textContent ?? "{}");
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.assign(client, { data: null, isPending: true, error: null });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
});

describe("session authority at identity transitions", () => {
  it("keeps unknown distinct from settled anonymous", async () => {
    await render();
    expect(shown()).toEqual({ user: null, pending: true });
    client.isPending = false;
    await render();
    expect(shown()).toEqual({ user: null, pending: false });
  });
  it("uses the streamed seed while client lookup is pending or errored", async () => {
    const alice = session("alice");
    await render(alice);
    expect(shown()).toEqual({ user: "alice", pending: false });
    Object.assign(client, {
      isPending: false,
      error: new Error("lookup failed"),
    });
    await render(alice);
    expect(shown()).toEqual({ user: "alice", pending: false });
  });
  it("settled sign-out defeats an existing and subsequently changed server seed", async () => {
    await render(session("alice"));
    Object.assign(client, { data: null, isPending: false, error: null });
    await render(session("alice"));
    expect(shown()).toEqual({ user: null, pending: false });
    await render(session("stale-server-user"));
    expect(shown()).toEqual({ user: null, pending: false });
  });
  it("uses the current client account instead of an earlier streamed account", async () => {
    const alice = session("alice");
    await render(alice);
    Object.assign(client, { data: session("bob"), isPending: false });
    await render(alice);
    expect(shown()).toEqual({ user: "bob", pending: false });
  });
});
