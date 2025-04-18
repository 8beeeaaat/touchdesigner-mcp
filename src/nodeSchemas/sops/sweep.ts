import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const sweep = createSOPSchema({
	xgrp: z.string().optional().describe("X Group"),
	pathgrp: z.string().optional().describe("Path Group"),
	refgrp: z.string().optional().describe("Reference Group"),
	cycle: z.string().optional().describe("Cycle"),
	angle: z.boolean().optional().describe("Angle"),
	noflip: z.boolean().optional().describe("No Flip"),
	skipcoin: z.boolean().optional().describe("Skip Coincident"),
	aimatref: z.boolean().optional().describe("Aim at Reference"),
	usevtx: z.boolean().optional().describe("Use Vertex"),
	vertex: z.number().optional().describe("Vertex"),
	scale: z.number().optional().describe("Scale"),
	twist: z.number().optional().describe("Twist"),
	roll: z.number().optional().describe("Roll"),
	newg: z.boolean().optional().describe("New Group"),
	sweepgrp: z.string().optional().describe("Sweep Group"),
	skin: z.string().optional().describe("Skin"),
	fast: z.boolean().optional().describe("Fast"),
});

export { sweep };
