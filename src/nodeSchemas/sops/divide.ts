import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const divide = createSOPSchema({
	group: z.string().optional().describe("Group"),
	convex: z.boolean().optional().describe("Convex"),
	numsides: z.number().optional().describe("Num Sides"),
	planar: z.boolean().optional().describe("Planar"),
	smooth: z.boolean().optional().describe("Smooth"),
	weight1: z.number().optional().describe("Weight 1"),
	weight2: z.number().optional().describe("Weight 2"),
	divs: z.number().optional().describe("Divisions"),
	brick: z.boolean().optional().describe("Brick"),
	sizex: z.number().optional().describe("Size X"),
	sizey: z.number().optional().describe("Size Y"),
	sizez: z.number().optional().describe("Size Z"),
	offsetx: z.number().optional().describe("Offset X"),
	offsety: z.number().optional().describe("Offset Y"),
	offsetz: z.number().optional().describe("Offset Z"),
	anglex: z.number().optional().describe("Angle X"),
	angley: z.number().optional().describe("Angle Y"),
	anglez: z.number().optional().describe("Angle Z"),
	removesh: z.boolean().optional().describe("Remove Shared Edges"),
	dual: z.boolean().optional().describe("Dual"),
});

export { divide };
