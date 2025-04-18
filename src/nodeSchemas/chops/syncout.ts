import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const syncout = createCHOPSchema({
	multicastaddress: z.string().optional().describe("Multicast Address"),
	port: z.number().optional().describe("Port"),
	localaddress: z.string().optional().describe("Local Address"),
	localportmode: z.string().optional().describe("Local Port Mode"),
	localport: z.number().optional().describe("Local Port"),
	timeout: z.number().optional().describe("Timeout"),
	timeoutunit: z.string().optional().describe("Timeout Unit"),
	clienttimeouts: z.number().optional().describe("Client Timeouts"),
	banclients: z.boolean().optional().describe("Ban Clients"),
	banclienttimeouts: z.number().optional().describe("Ban Client Timeouts"),
	clearstats: z.boolean().optional().describe("Clear Stats"),
});
