import { z } from "zod";

/** Default per-request proxy timeout over the tunnel. */
export const TUNNEL_DEFAULT_TIMEOUT_MS = 60_000;

export const tunnelHelloSchema = z.object({
	type: z.literal("hello"),
	targetId: z.string().min(1),
	nonce: z.string().min(1),
	osPid: z.number().int().optional(),
	toePath: z.string().optional(),
	projectFolder: z.string().optional(),
	projectName: z.string().optional(),
	label: z.string().optional(),
});

export type TunnelHello = z.infer<typeof tunnelHelloSchema>;

export const tunnelHelloAckSchema = z.object({
	type: z.literal("hello_ack"),
	ok: z.boolean(),
	error: z.string().optional(),
	targetId: z.string().optional(),
});

export type TunnelHelloAck = z.infer<typeof tunnelHelloAckSchema>;

export const tunnelRequestSchema = z.object({
	type: z.literal("request"),
	id: z.string().min(1),
	method: z.string().min(1),
	path: z.string().min(1),
	query: z.record(z.string(), z.string()).optional(),
	headers: z.record(z.string(), z.string()).optional(),
	body: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
});

export type TunnelRequest = z.infer<typeof tunnelRequestSchema>;

export const tunnelResponseSchema = z.object({
	type: z.literal("response"),
	id: z.string().min(1),
	statusCode: z.number().int(),
	statusReason: z.string().optional(),
	headers: z.record(z.string(), z.string()).optional(),
	body: z.string().optional(),
});

export type TunnelResponse = z.infer<typeof tunnelResponseSchema>;

export const tunnelMessageSchema = z.discriminatedUnion("type", [
	tunnelHelloSchema,
	tunnelHelloAckSchema,
	tunnelRequestSchema,
	tunnelResponseSchema,
]);

export type TunnelMessage = z.infer<typeof tunnelMessageSchema>;

export const expectPeerBodySchema = z.object({
	id: z.string().min(1),
	nonce: z.string().min(1),
	label: z.string().optional(),
	projectDir: z.string().optional(),
	toePath: z.string().optional(),
	/** How long the expect stays valid before hello (ms). Default 10 min. */
	ttlMs: z.number().int().positive().optional(),
});

export type ExpectPeerBody = z.infer<typeof expectPeerBodySchema>;
