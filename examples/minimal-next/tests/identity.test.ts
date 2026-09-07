import { afterAll, expect, test } from "bun:test";
import { SignJWT } from "jose";
import { caller, sameOrigin } from "../lib/identity";

const previousSecret = process.env.APP_IDENTITY_SECRET;
const previousOrigin = process.env.APP_ORIGIN;
const secret = crypto.randomUUID() + crypto.randomUUID();
process.env.APP_IDENTITY_SECRET = secret;
process.env.APP_ORIGIN = "http://localhost:7314";
afterAll(() => {
	if (previousSecret === undefined) delete process.env.APP_IDENTITY_SECRET;
	else process.env.APP_IDENTITY_SECRET = previousSecret;
	if (previousOrigin === undefined) delete process.env.APP_ORIGIN;
	else process.env.APP_ORIGIN = previousOrigin;
});

async function token(
	issuer = "chatjs-host",
	audience = "chatjs-minimal",
	expiration = "1h",
	key = secret,
) {
	return new SignJWT({})
		.setProtectedHeader({ alg: "HS256" })
		.setSubject("alice")
		.setIssuer(issuer)
		.setAudience(audience)
		.setExpirationTime(expiration)
		.sign(new TextEncoder().encode(key));
}
function request(value: string) {
	return new Request("http://localhost:7314", {
		headers: { authorization: `Bearer ${value}`, "x-chatjs-owner": "bob" },
	});
}

test("verified identity ignores spoofed owner and accepts bearer or host cookie", async () => {
	const valid = await token();
	expect(await caller(request(valid))).toBe("alice");
	expect(
		await caller(
			new Request("http://localhost:7314", {
				headers: { cookie: `chatjs_identity=${valid}` },
			}),
		),
	).toBe("alice");
	expect(
		await caller(
			new Request("http://localhost:7314", {
				headers: { "x-chatjs-owner": "alice" },
			}),
		),
	).toBeNull();
});

test("wrong issuer, audience, signature and expired credentials fail closed", async () => {
	for (const invalid of [
		await token("other"),
		await token("chatjs-host", "other"),
		await token("chatjs-host", "chatjs-minimal", "-1h"),
		await token("chatjs-host", "chatjs-minimal", "1h", "not-the-key"),
	])
		expect(await caller(request(invalid))).toBeNull();
});

test("mutations require configured browser origin, even with bearer credentials", () => {
	for (const origin of [undefined, "https://other.test", "null"])
		expect(
			sameOrigin(
				new Request("http://localhost:7314", {
					method: "POST",
					headers: origin ? { origin } : {},
				}),
			),
		).toBe(false);
	expect(
		sameOrigin(
			new Request("http://localhost:7314", {
				method: "POST",
				headers: { origin: "http://localhost:7314" },
			}),
		),
	).toBe(true);
});
