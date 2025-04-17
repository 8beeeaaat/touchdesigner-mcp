import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const touchout = createCHOPSchema({
	protocol: z.string().optional().describe("Protocol"),
	address: z.string().optional().describe("Address"),
	port: z.number().optional().describe("Port"),
	maxsize: z.number().optional().describe("Max Size"),
	maxsizeunit: z.string().optional().describe("Max Size Unit"),
	cookalways: z.boolean().optional().describe("Cook Always"),
	forcesendnames: z.boolean().optional().describe("Force Send Names"),
	forcesendnamespulse: z
		.boolean()
		.optional()
		.describe("Force Send Names Pulse"),
	syncports: z.string().optional().describe("Sync Ports"),
});
