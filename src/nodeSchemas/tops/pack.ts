import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const pack = createTOPSchema({
	pageindex: z.number().optional(),
	tops: z.any().optional(),
	layout: z.string().optional(),
	rowcol: z.number().optional(),
	cellwidth: z.union([z.number(), z.string()]).optional(),
	cellheight: z.union([z.number(), z.string()]).optional(),
	cellunit: z.string().optional(),
	padding: z.number().optional(),
	paddingunit: z.string().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { pack };
