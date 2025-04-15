import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const pointtransform = createTOPSchema({
	pageindex: z.number().optional(),
	transformmode: z.string().optional(),
	transform: z.string().optional(),
	transformdat: z.any().optional(),
	tx: z.number().optional(),
	ty: z.number().optional(),
	tz: z.number().optional(),
	rx: z.number().optional(),
	ry: z.number().optional(),
	rz: z.number().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	sz: z.number().optional(),
	uniformscale: z.boolean().optional(),
	pivot: z.string().optional(),
	px: z.number().optional(),
	py: z.number().optional(),
	pz: z.number().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { pointtransform };
