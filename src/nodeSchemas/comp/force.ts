import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

const force = createCOMPSchema({
	active: z.boolean().optional().describe("Active"),
	forcex: z.number().optional().describe("Force X"),
	forcey: z.number().optional().describe("Force Y"),
	forcez: z.number().optional().describe("Force Z"),
	offsetx: z.number().optional().describe("Offset X"),
	offsety: z.number().optional().describe("Offset Y"),
	offsetz: z.number().optional().describe("Offset Z"),
	torquex: z.number().optional().describe("Torque X"),
	torquey: z.number().optional().describe("Torque Y"),
	torquez: z.number().optional().describe("Torque Z"),
	impulse: z.boolean().optional().describe("Impulse"),
	ffactive: z.boolean().optional().describe("Force Field Active"),
	strength: z.number().optional().describe("Strength"),
	radius: z.number().optional().describe("Radius"),
	falloff: z.boolean().optional().describe("Falloff")
});

export { force };