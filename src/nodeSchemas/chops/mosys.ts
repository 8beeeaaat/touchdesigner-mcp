import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const mosys = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	protocol: z.string().optional().describe("Protocol"),
	netaddress: z.string().optional().describe("Network Address"),
	port: z.number().optional().describe("Port"),
	localaddress: z.string().optional().describe("Local Address"),
	cameraid: z.string().optional().describe("Camera ID"),
	screenwidth: z.number().optional().describe("Screen Width"),
});
