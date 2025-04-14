import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const orbbecselect = createTOPSchema({
	pageindex: z.number().optional(),
	top: z.any().optional(),
	stream: z.string().optional(),
	aligned: z.boolean().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { orbbecselect };
