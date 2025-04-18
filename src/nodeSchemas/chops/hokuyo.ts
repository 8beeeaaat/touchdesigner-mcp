import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const hokuyo = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	restart: z.boolean().optional().describe("Restart"),
	interface: z.string().optional().describe("Interface"),
	port: z.string().optional().describe("Port"),
	netaddress: z.string().optional().describe("Network Address"),
	highsensitivity: z.boolean().optional().describe("High Sensitivity"),
	motorspeed: z.number().optional().describe("Motor Speed"),
	startstep: z.number().optional().describe("Start Step"),
	endstep: z.number().optional().describe("End Step"),
	output: z.string().optional().describe("Output"),
});
