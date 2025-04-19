import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const webserver = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	restart: z.boolean().optional().describe("Restart"),
	port: z.number().optional().describe("Port"),
	callbacks: z.string().optional().describe("Callbacks"),
	secure: z.boolean().optional().describe("Secure"),
	privatekey: z.string().optional().describe("Private Key"),
	certificate: z.string().optional().describe("Certificate"),
	password: z.string().optional().describe("Password"),
	verifyclient: z.boolean().optional().describe("Verify Client"),
});
