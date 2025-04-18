import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const zed = createSOPSchema({
	camera: z.string().optional().describe("Camera"),
	sample: z.boolean().optional().describe("Sample"),
	reset: z.boolean().optional().describe("Reset"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
	preview: z.string().optional().describe("Preview"),
	maxmemory: z.number().optional().describe("Maximum Memory"),
	resolution: z.number().optional().describe("Resolution"),
	range: z.number().optional().describe("Range"),
	normals: z.boolean().optional().describe("Normals"),
	texture: z.boolean().optional().describe("Texture"),
	filter: z.string().optional().describe("Filter"),
	consolidatepts: z.boolean().optional().describe("Consolidate Points"),
});

export { zed };
