import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const laserdevice = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	type: z.string().optional().describe("Type"),
	device: z.string().optional().describe("Device"),
	scan: z.boolean().optional().describe("Scan"),
	netaddress: z.string().optional().describe("Network Address"),
	port: z.number().optional().describe("Port"),
	localaddress: z.string().optional().describe("Local Address"),
	queuetime: z.number().optional().describe("Queue Time"),
	queueunits: z.string().optional().describe("Queue Units"),
	xscale: z.number().optional().describe("X Scale"),
	yscale: z.number().optional().describe("Y Scale"),
	redscale: z.number().optional().describe("Red Scale"),
	greenscale: z.number().optional().describe("Green Scale"),
	bluescale: z.number().optional().describe("Blue Scale"),
	intensityscale: z.number().optional().describe("Intensity Scale"),
});
