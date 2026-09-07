import { z } from "zod";

export const createOperationSchema = z
	.object({
		operationId: z.uuid(),
		message: z.string().trim().min(1).max(16000),
	})
	.strict();
const pendingKey = "chatjs.pending-create";
type PendingStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Validate before persisting: rejected input must not poison every retry. */
export function prepareCreation(storage: PendingStorage, draft: string) {
	const stored = storage.getItem(pendingKey);
	if (stored) {
		let value: unknown;
		try {
			value = JSON.parse(stored);
		} catch {
			throw new Error(
				"Stored creation request is unreadable. Preserve it and reconcile the pending operation before starting another conversation.",
			);
		}
		const pending = createOperationSchema.safeParse(value);
		if (pending.success) return pending.data;
		// The server uses this same schema, so this payload could never reserve.
		storage.removeItem(pendingKey);
	}
	const parsed = createOperationSchema.safeParse({
		operationId: crypto.randomUUID(),
		message: draft,
	});
	if (!parsed.success)
		throw new Error("Enter a message between 1 and 16,000 characters.");
	const operation = parsed.data;
	storage.setItem(pendingKey, JSON.stringify(operation));
	return operation;
}

export function finishCreation(storage: PendingStorage) {
	storage.removeItem(pendingKey);
}
