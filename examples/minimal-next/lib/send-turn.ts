/** A previous cancellation may settle the response before the new turn is read.
 * Catch up only for the next command after cancellation, using public replay. */
export async function sendTurn(
	send: () => Promise<void>,
	resume: () => Promise<void>,
	afterCancellation = false,
	getError: () => Error | undefined = () => undefined,
): Promise<void> {
	await send();
	const sendError = getError();
	if (sendError) throw sendError;
	if (afterCancellation) await resume();
	const resumeError = getError();
	if (resumeError) throw resumeError;
}
