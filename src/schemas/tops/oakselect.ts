import { z } from "zod";
import { createTOPSchema } from "./index.js";

const oakselect = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	top: z.any().optional(),
	source: z.string().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { oakselect };
