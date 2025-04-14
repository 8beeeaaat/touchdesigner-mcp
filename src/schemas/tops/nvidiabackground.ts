import { z } from "zod";
import { createTOPSchema } from "./index.js";

const nvidiabackground = createTOPSchema({
	pageindex: z.number().optional(),
	modelfolder: z.string().optional(),
	mode: z.string().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
	resmult: z.boolean().optional(),
	outputaspect: z.string().optional(),
	aspect1: z.number().optional(),
	aspect2: z.number().optional(),
	inputfiltertype: z.string().optional(),
	fillmode: z.string().optional(),
	filtertype: z.string().optional(),
	npasses: z.number().optional(),
	chanmask: z.string().optional(),
	format: z.string().optional(),
});

export { nvidiabackground };
