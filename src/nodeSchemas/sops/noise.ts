import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const noise = createSOPSchema({
	group: z.string().optional().describe("Group"),
	attribute: z.string().optional().describe("Attribute"),
	type: z.string().optional().describe("Noise Type"),
	seed: z.number().optional().describe("Seed"),
	period: z.number().optional().describe("Period"),
	harmon: z.number().optional().describe("Harmonics"),
	spread: z.number().optional().describe("Spread"),
	rough: z.number().optional().describe("Roughness"),
	exp: z.number().optional().describe("Exponent"),
	numint: z.number().optional().describe("Number of Iterations"),
	amp: z.number().optional().describe("Amplitude"),
	offset: z.number().optional().describe("Offset"),
	keepnormals: z.boolean().optional().describe("Keep Normals"),
	xord: z.string().optional().describe("Transform Order"),
	rord: z.string().optional().describe("Rotation Order"),
	tx: z.number().optional().describe("Translate X"),
	ty: z.number().optional().describe("Translate Y"),
	tz: z.number().optional().describe("Translate Z"),
	rx: z.number().optional().describe("Rotate X"),
	ry: z.number().optional().describe("Rotate Y"),
	rz: z.number().optional().describe("Rotate Z"),
	sx: z.number().optional().describe("Scale X"),
	sy: z.number().optional().describe("Scale Y"),
	sz: z.number().optional().describe("Scale Z"),
	px: z.number().optional().describe("Pivot X"),
	py: z.number().optional().describe("Pivot Y"),
	pz: z.number().optional().describe("Pivot Z"),
});

export { noise };
