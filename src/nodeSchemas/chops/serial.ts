import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const serial = createCHOPSchema({
	state: z.string().optional().describe("State"),
	port: z.string().optional().describe("Port"),
	baudrate: z.number().optional().describe("Baud Rate"),
	databits: z.string().optional().describe("Data Bits"),
	parity: z.string().optional().describe("Parity"),
	stopbits: z.string().optional().describe("Stop Bits"),
	script: z.number().optional().describe("Script"),
	script0callback: z.string().optional().describe("Script 0 Callback"),
});
