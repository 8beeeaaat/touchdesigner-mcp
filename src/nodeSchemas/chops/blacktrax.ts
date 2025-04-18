import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for blacktrax CHOP node parameters
 */
export const blacktrax = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	port: z.number().optional().describe("Port"),
	protocol: z.string().optional().describe("Protocol"),
	netaddress: z.string().optional().describe("Net Address"),
	samplerate: z.number().optional().describe("Sample Rate"),
	outputformat: z.string().optional().describe("Output Format"),
	maxbeacons: z.number().optional().describe("Max Beacons"),
	centroid: z.boolean().optional().describe("Centroid"),
	velocity: z.boolean().optional().describe("Velocity"),
	acceleration: z.boolean().optional().describe("Acceleration"),
	leds: z.boolean().optional().describe("LEDs"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
	mappingtable: z.string().optional().describe("Mapping Table"),
});
