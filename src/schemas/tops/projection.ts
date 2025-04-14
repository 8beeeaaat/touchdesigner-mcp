import { z } from "zod";
import { createTOPSchema } from "./index.js";

const projection = createTOPSchema({
	pageindex: z.number().optional(),
	camerapath: z.string().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	usecustom: z.boolean().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { projection };
