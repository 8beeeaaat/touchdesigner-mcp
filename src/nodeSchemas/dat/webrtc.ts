import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const webrtc = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	reset: z.boolean().optional().describe("Reset"),
	bitratelimits: z.boolean().optional().describe("Bitrate Limits"),
	minbitrate: z.number().optional().describe("Min Bitrate"),
	maxbitrate: z.number().optional().describe("Max Bitrate"),
	callbacks: z.string().optional().describe("Callbacks"),
	stun: z.string().optional().describe("STUN Server"),
	username: z.string().optional().describe("Username"),
	password: z.string().optional().describe("Password"),
	turn: z.number().optional().describe("TURN"),
	turn0server: z.string().optional().describe("TURN Server 0"),
});
