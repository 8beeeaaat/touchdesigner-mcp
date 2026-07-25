import { z } from "zod";

export const hubPeerSourceSchema = z.enum([
	"registered",
	"owned",
	"builtin",
]);

export type HubPeerSource = z.infer<typeof hubPeerSourceSchema>;

export const hubTransportSchema = z.enum(["http", "tunnel"]);

export type HubTransport = z.infer<typeof hubTransportSchema>;

export const hubPeerSchema = z.object({
	host: z.string().min(1),
	id: z.string().min(1),
	label: z.string().optional(),
	osPid: z.number().int().optional(),
	/** Listen port for HTTP peers; 0 for tunnel peers (no listen). */
	port: z.number().int().min(0).max(65535),
	projectDir: z.string().optional(),
	projectFolder: z.string().optional(),
	projectName: z.string().optional(),
	source: hubPeerSourceSchema.default("registered"),
	toePath: z.string().optional(),
	transport: hubTransportSchema.optional().default("http"),
	nonce: z.string().optional(),
	tunnelConnected: z.boolean().optional(),
});

export type HubPeer = z.infer<typeof hubPeerSchema>;

export type HubPeerRecord = HubPeer & {
	lastHeartbeatAt: number;
	registeredAt: number;
};

export const registerPeerBodySchema = hubPeerSchema;

export const heartbeatBodySchema = z.object({
	id: z.string().min(1),
});

export const stickyBodySchema = z.object({
	id: z.string().min(1),
});

export type HubHealth = {
	app: string;
	ok: true;
	version: string;
	peerCount: number;
	selectedId: string | null;
};
