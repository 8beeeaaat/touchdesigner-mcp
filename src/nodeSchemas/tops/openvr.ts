import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const openvr = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	mode: z.string().optional(),
	eye: z.string().optional(),
	rendermodel: z.string().optional(),
	device: z.string().optional(),
	texwidth: z.number().optional(),
	texheight: z.number().optional(),
	supersample: z.number().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { openvr };
