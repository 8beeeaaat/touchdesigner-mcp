import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const udpout = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	protocol: z.string().optional().describe("Protocol"),
	address: z.string().optional().describe("Address"),
	port: z.number().optional().describe("Port"),
	shared: z.boolean().optional().describe("Shared"),
	format: z.string().optional().describe("Format"),
	localaddress: z.string().optional().describe("Local Address"),
	localportmode: z.string().optional().describe("Local Port Mode"),
	localport: z.number().optional().describe("Local Port"),
	callbacks: z.any().optional().describe("Callbacks"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	clamp: z.boolean().optional().describe("Clamp"),
	maxlines: z.number().optional().describe("Max Lines"),
	clear: z.boolean().optional().describe("Clear"),
	messageoutput: z.string().optional().describe("Message Output"),
	bytes: z.boolean().optional().describe("Bytes"),
});
