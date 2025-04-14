import { z } from "zod";
import { createTOPSchema } from "./index.js";

const oculusrift = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	mode: z.string().optional(),
	eye: z.string().optional(),
	pixeldensity: z.number().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { oculusrift };
