import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const oculusrift = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	output: z.string().optional().describe("Output"),
	orientation: z.boolean().optional().describe("Orientation"),
	recenter: z.boolean().optional().describe("Recenter"),
	acceleration: z.boolean().optional().describe("Acceleration"),
	velocity: z.boolean().optional().describe("Velocity"),
	deviceinfo: z.boolean().optional().describe("Device Info"),
	controllerbuttons: z.boolean().optional().describe("Controller Buttons"),
	near: z.number().optional().describe("Near"),
	far: z.number().optional().describe("Far"),
	origin: z.string().optional().describe("Origin"),
});
