import { expect, test } from "bun:test";
import { finishCreation, prepareCreation } from "../lib/create-operation";
import { sendTurn } from "../lib/send-turn";

function storage() {
	const values = new Map<string, string>();
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value);
		},
		removeItem: (key: string) => {
			values.delete(key);
		},
	};
}

test("invalid first input cannot poison a later corrected submission", () => {
	const pending = storage();
	expect(() => prepareCreation(pending, "x".repeat(16001))).toThrow();
	expect(pending.getItem("chatjs.pending-create")).toBeNull();
	expect(prepareCreation(pending, " corrected ").message).toBe("corrected");
});

test("unreadable pending storage stays intact for reconciliation", () => {
	const pending = storage();
	pending.setItem("chatjs.pending-create", "{broken");
	expect(() => prepareCreation(pending, "new message")).toThrow(
		"reconcile the pending operation",
	);
	expect(pending.getItem("chatjs.pending-create")).toBe("{broken");
});

test("recover a legacy rejected payload, but preserve a possibly executed request", () => {
	const pending = storage();
	pending.setItem(
		"chatjs.pending-create",
		JSON.stringify({
			operationId: crypto.randomUUID(),
			message: "x".repeat(16001),
		}),
	);
	const request = prepareCreation(pending, "first accepted request");
	expect(prepareCreation(pending, "different draft")).toEqual(request);
	finishCreation(pending);
	const next = prepareCreation(pending, "new request");
	expect(next.operationId).not.toBe(request.operationId);
});

test("cancel catch-up uses replay only after an accepted command", async () => {
	const events: string[] = [];
	const send = async () => {
		events.push("send");
	};
	const resume = async () => {
		events.push("resume");
	};
	await sendTurn(send, resume);
	expect(events).toEqual(["send"]);
	await sendTurn(send, resume, true);
	expect(events).toEqual(["send", "send", "resume"]);
	await expect(
		sendTurn(
			async () => {
				throw new Error("command failed");
			},
			resume,
			true,
		),
	).rejects.toThrow("command failed");
	expect(events).toEqual(["send", "send", "resume"]);
	await expect(
		sendTurn(
			send,
			async () => {
				throw new Error("resume failed");
			},
			true,
		),
	).rejects.toThrow("resume failed");
});

test("Eve callback errors count as failure even when the command promise resolves", async () => {
	let failure: Error | undefined;
	let resumed = false;
	await expect(
		sendTurn(
			async () => {
				failure = new Error("rejected send");
			},
			async () => {
				resumed = true;
			},
			true,
			() => failure,
		),
	).rejects.toThrow("rejected send");
	expect(resumed).toBe(false);
	failure = undefined;
	await expect(
		sendTurn(
			async () => {},
			async () => {
				failure = new Error("replay failed");
			},
			true,
			() => failure,
		),
	).rejects.toThrow("replay failed");
});
