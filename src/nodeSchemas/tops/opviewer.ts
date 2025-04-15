import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const opviewer = createTOPSchema({
	pageindex: z.number().optional(),
	op: z.string().optional(),
	refreshpulse: z.boolean().optional(),
	zoom: z.number().optional(),
	grid: z.boolean().optional(),
	gridalpha: z.number().optional(),
	gridcolor: z.string().optional(),
	background: z.string().optional(),
	bgcolor: z.string().optional(),
	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { opviewer };
