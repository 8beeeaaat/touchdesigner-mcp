import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const serial = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	port: z.string().optional().describe("Port"),
	baudrate: z.number().optional().describe("Baud Rate"),
	databits: z.number().optional().describe("Data Bits"),
	parity: z.string().optional().describe("Parity"),
	stopbits: z.number().optional().describe("Stop Bits"),
	flowcontrol: z.string().optional().describe("Flow Control"),
	terminator: z.string().optional().describe("Terminator"),
	callbacks: z.string().optional().describe("Callbacks"),
});
