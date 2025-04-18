import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const force = createSOPSchema({
	doradial: z.boolean().optional().describe("Do Radial"),
	radial: z.number().optional().describe("Radial"),
	doaxis: z.boolean().optional().describe("Do Axis"),
	dirx: z.number().optional().describe("Direction X"),
	diry: z.number().optional().describe("Direction Y"),
	dirz: z.number().optional().describe("Direction Z"),
	axial: z.number().optional().describe("Axial"),
	vortex: z.number().optional().describe("Vortex"),
	spiral: z.number().optional().describe("Spiral"),
});

export { force };
