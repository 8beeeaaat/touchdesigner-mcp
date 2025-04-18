import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const oscout = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	protocol: z.string().optional().describe("Protocol"),
	netaddress: z.string().optional().describe("Network Address"),
	port: z.number().optional().describe("Port"),
	localaddress: z.string().optional().describe("Local Address"),
	maxsize: z.number().optional().describe("Maximum Size"),
	maxsizeunit: z.string().optional().describe("Maximum Size Unit"),
	cookalways: z.boolean().optional().describe("Cook Always"),
	numericformat: z.string().optional().describe("Numeric Format"),
	format: z.string().optional().describe("Format"),
	sendrate: z.boolean().optional().describe("Send Rate"),
	maxbytes: z.number().optional().describe("Maximum Bytes"),
	sendevents: z.boolean().optional().describe("Send Events"),
});
