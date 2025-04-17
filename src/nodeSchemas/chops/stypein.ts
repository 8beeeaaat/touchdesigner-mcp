import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const stypein = createCHOPSchema({
	protocol: z.string().optional().describe("Protocol"),
	netaddress: z.string().optional().describe("Network Address"),
	port: z.number().optional().describe("Port"),
	localaddress: z.string().optional().describe("Local Address"),
	padding: z.number().optional().describe("Padding"),
	legacynames: z.boolean().optional().describe("Legacy Names"),
});
