import { z } from "zod";
import { createTOPSchema } from "./index.js";

const transform = createTOPSchema({
	pageindex: z.number().optional(),
	xord: z.string().optional(),
	tx: z.number().optional(),
	ty: z.number().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	centerx: z.number().optional(),
	centery: z.number().optional(),
	centerunit: z.string().optional(),
	rotate: z.number().optional(),
	cameraunit: z.string().optional(),
	nearclip: z.number().optional(),
	farclip: z.number().optional(),
	fovxcustom: z.number().optional(),
	fovycustom: z.number().optional(),
	filtertype: z.string().optional(),
	extend: z.string().optional(),
	resx: z.string().optional(),
	resy: z.string().optional(),
	newx: z.number().optional(),
	newy: z.number().optional(),
	preserveaspect: z.boolean().optional(),
});

export { transform };
