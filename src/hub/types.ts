import { z } from "zod";

export const hubPeerSourceSchema = z.enum([
	"registered",
	"owned",
	"builtin",
]);

export type HubPeerSource = z.infer<typeof hubPeerSourceSchema>;

export const hubPeerSchema = z.object({
	host: z.string().min(1),
	id: z.string().min(1),
	label: z.string().optional(),
	osPid: z.number().int().optional(),
	port: z.number().int().min(1).max(65535),
	projectDir: z.string().optional(),
	projectFolder: z.string().optional(),
	projectName: z.string().optional(),
	source: hubPeerSourceSchema.default("registered"),
	toePath: z.string().optional(),
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
