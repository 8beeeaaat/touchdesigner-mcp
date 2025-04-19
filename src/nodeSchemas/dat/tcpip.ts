import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const tcpip = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	mode: z.string().optional().describe("Mode"),
	address: z.string().optional().describe("Address"),
	port: z.number().optional().describe("Port"),
	terminator: z.string().optional().describe("Terminator"),
	autoconnect: z.boolean().optional().describe("Auto Connect"),
	connect: z.boolean().optional().describe("Connect"),
	connectpulse: z.boolean().optional().describe("Connect Pulse"),
	disconnect: z.boolean().optional().describe("Disconnect"),
	disconnectpulse: z.boolean().optional().describe("Disconnect Pulse"),
	callbacks: z.string().optional().describe("Callbacks"),
});
