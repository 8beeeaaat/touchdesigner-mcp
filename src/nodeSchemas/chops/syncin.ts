import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const syncin = createCHOPSchema({
	multicastaddress: z.string().optional().describe("Multicast Address"),
	port: z.number().optional().describe("Port"),
	localaddress: z.string().optional().describe("Local Address"),
	timeout: z.number().optional().describe("Timeout"),
	timeoutunit: z.string().optional().describe("Timeout Unit"),
	callbacks: z.string().optional().describe("Callbacks"),
});
