import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const touchout = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	protocol: z.string().optional().describe("Protocol"),
	address: z.string().optional().describe("Address"),
	port: z.number().optional().describe("Port"),
	shared: z.boolean().optional().describe("Shared"),
	redundantsends: z.number().optional().describe("Redundant Sends"),
	resend: z.boolean().optional().describe("Resend"),
});
