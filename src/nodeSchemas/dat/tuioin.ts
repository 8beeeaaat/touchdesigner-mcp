import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const tuioin = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	protocol: z.string().optional().describe("Protocol"),
	address: z.string().optional().describe("Address"),
	port: z.number().optional().describe("Port"),
	shared: z.boolean().optional().describe("Shared"),
	angle: z.boolean().optional().describe("Angle"),
	size: z.boolean().optional().describe("Size"),
	velocity: z.boolean().optional().describe("Velocity"),
	accel: z.boolean().optional().describe("Acceleration"),
	profile: z.boolean().optional().describe("Profile"),
	classid: z.boolean().optional().describe("Class ID"),
	timestamp: z.boolean().optional().describe("Timestamp"),
	callbacks: z.string().optional().describe("Callbacks"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
});
