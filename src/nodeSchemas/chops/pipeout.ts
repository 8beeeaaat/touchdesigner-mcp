import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const pipeout = createCHOPSchema({
	mode: z.string().optional().describe("Mode"),
	address: z.string().optional().describe("Address"),
	port: z.number().optional().describe("Port"),
	active: z.boolean().optional().describe("Active"),
	sendinput: z.boolean().optional().describe("Send Input"),
	sendsingle: z.boolean().optional().describe("Send Single"),
	sample: z.string().optional().describe("Sample"),
	upload: z.boolean().optional().describe("Upload"),
	script: z.string().optional().describe("Script"),
	sendscript: z.boolean().optional().describe("Send Script"),
	cookalways: z.boolean().optional().describe("Cook Always"),
	pulse: z.boolean().optional().describe("Pulse"),
	echo: z.boolean().optional().describe("Echo"),
	callbacks: z.string().optional().describe("Callbacks"),
});
