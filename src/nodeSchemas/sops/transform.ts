import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const transform = createSOPSchema({
	group: z.string().optional().describe("Group"),
	xord: z.string().optional().describe("Transform Order"),
	sx: z.number().optional().describe("Scale X"),
	sy: z.number().optional().describe("Scale Y"),
	sz: z.number().optional().describe("Scale Z"),
	px: z.number().optional().describe("Pivot X"),
	py: z.number().optional().describe("Pivot Y"),
	pz: z.number().optional().describe("Pivot Z"),
	scale: z.number().optional().describe("Scale"),
	vlength: z.boolean().optional().describe("Preserve Vector Length"),
	lookat: z.union([z.string(), z.null()]).optional().describe("Look At"),
	upvectorx: z.number().optional().describe("Up Vector X"),
	upvectory: z.number().optional().describe("Up Vector Y"),
	upvectorz: z.number().optional().describe("Up Vector Z"),
	forwarddir: z.string().optional().describe("Forward Direction"),
	postxord: z.string().optional().describe("Post Transform Order"),
	posttx: z.string().optional().describe("Post Translate X"),
	fromx: z.string().optional().describe("From X"),
	tox: z.string().optional().describe("To X"),
	postty: z.string().optional().describe("Post Translate Y"),
	fromy: z.string().optional().describe("From Y"),
	toy: z.string().optional().describe("To Y"),
	posttz: z.string().optional().describe("Post Translate Z"),
	fromz: z.string().optional().describe("From Z"),
	toz: z.string().optional().describe("To Z"),
	postscale: z.string().optional().describe("Post Scale"),
	postscalex: z.string().optional().describe("Post Scale X"),
	postscaley: z.string().optional().describe("Post Scale Y"),
	postscalez: z.string().optional().describe("Post Scale Z"),
});

export { transform };
