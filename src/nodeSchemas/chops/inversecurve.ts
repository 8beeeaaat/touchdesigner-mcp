import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const inversecurve = createCHOPSchema({
	pageindex: z.number().describe("Page Index"),
	guide: z.any().nullable().describe("Guide"),
	bonestart: z.any().nullable().describe("Bone Start"),
	boneend: z.any().nullable().describe("Bone End"),
	span1: z.number().describe("Span 1"),
	span2: z.number().describe("Span 2"),
	interpolation: z.string().describe("Interpolation"),
	order: z.number().describe("Order"),
	upvectorx: z.number().describe("Up Vector X"),
	upvectory: z.number().describe("Up Vector Y"),
	upvectorz: z.number().describe("Up Vector Z"),
	mapexports: z.boolean().describe("Map Exports"),
});
