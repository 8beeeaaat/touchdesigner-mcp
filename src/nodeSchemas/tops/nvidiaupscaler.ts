import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const nvidiaupscaler = createTOPSchema({
	pageindex: z.number().optional(),
	algorithmtype: z.string().optional(),
	scale: z.number().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { nvidiaupscaler };
