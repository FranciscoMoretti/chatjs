import { expect, it } from "bun:test";
import { builtInGateways, resolveGateway } from "./gateways";

it("requires secure remote transport for roots, dependencies and redirects", async () => {
	await expect(
		resolveGateway("http://example.com/gateway.json"),
	).rejects.toThrow("HTTPS");
	const item = builtInGateways[0];
	const server = Bun.serve({
		port: 0,
		hostname: "127.0.0.1",
		fetch(request) {
			const path = new URL(request.url).pathname;
			if (path === "/loopback-redirect.json")
				return Response.redirect(new URL("/item.json", request.url));
			if (path === "/redirect.json")
				return Response.redirect("http://example.com/item.json");
			if (path === "/dependencies.json")
				return Response.json({
					...item,
					registryDependencies: ["http://example.com/adapter.json"],
				});
			if (path === "/invalid.json")
				return Response.json({ ...item, type: "registry:lib" });
			return Response.json(item);
		},
	});
	try {
		const base = `HTTP://127.0.0.1:${server.port}`;
		expect((await resolveGateway(`${base}/item.json`)).definition.id).toBe(
			"vercel",
		);
		await expect(
			resolveGateway(`${base}/loopback-redirect.json`),
		).rejects.toThrow("HTTPS");
		await expect(resolveGateway(`${base}/redirect.json`)).rejects.toThrow(
			"HTTPS",
		);
		await expect(resolveGateway(`${base}/dependencies.json`)).rejects.toThrow(
			"HTTPS",
		);
		await expect(resolveGateway(`${base}/invalid.json`)).rejects.toThrow(
			"type registry:item",
		);
	} finally {
		server.stop(true);
	}
});
