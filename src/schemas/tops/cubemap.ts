import { z } from "zod";
import { createTOPSchema } from "./index.js";

const cubemap = createTOPSchema({
	pageindex: z.number().optional(),
	mode: z.string().optional(),
	inputtype: z.string().optional(),
	outputtype: z.string().optional(),
	facesperrow: z.number().optional(),
	facereftype: z.string().optional(),
	faceref: z.string().optional(),
	xrot: z.number().optional(),
	yrot: z.number().optional(),
	zrot: z.number().optional(),
});

export { cubemap };
