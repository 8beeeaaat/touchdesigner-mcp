import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const oscin = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	protocol: z.string().optional().describe("Protocol"),
	address: z.string().optional().describe("Address"),
	port: z.number().optional().describe("Port"),
	localaddress: z.string().optional().describe("Local Address"),
	shared: z.boolean().optional().describe("Shared"),
	addscope: z.string().optional().describe("Add Scope"),
	typetag: z.boolean().optional().describe("Type Tag"),
	splitbundle: z.boolean().optional().describe("Split Bundle"),
	splitmessage: z.boolean().optional().describe("Split Message"),
	bundletimestamp: z.boolean().optional().describe("Bundle Timestamp"),
	callbacks: z.string().optional().describe("Callbacks"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	clamp: z.boolean().optional().describe("Clamp"),
	maxlines: z.number().optional().describe("Max Lines"),
	clear: z.boolean().optional().describe("Clear"),
	bytes: z.boolean().optional().describe("Bytes"),
});
