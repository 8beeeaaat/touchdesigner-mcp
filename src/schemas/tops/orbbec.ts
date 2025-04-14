import { z } from "zod";
import { createTOPSchema } from "./index.js";

const orbbec = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	device: z.string().optional(),
	stream: z.string().optional(),
	aligned: z.boolean().optional(),
	colorprofile: z.string().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { orbbec };
