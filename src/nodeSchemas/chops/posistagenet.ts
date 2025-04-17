import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const posistagenet = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	netaddress: z.string().optional().describe("Network Address"),
	port: z.number().optional().describe("Port"),
	localaddress: z.string().optional().describe("Local Address"),
	samplerate: z.number().optional().describe("Sample Rate"),
	pos: z.boolean().optional().describe("Position"),
	ori: z.boolean().optional().describe("Orientation"),
	speed: z.boolean().optional().describe("Speed"),
	accel: z.boolean().optional().describe("Acceleration"),
	targetpos: z.boolean().optional().describe("Target Position"),
	reset: z.boolean().optional().describe("Reset"),
});
