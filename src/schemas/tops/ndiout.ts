import { z } from "zod";
import { createTOPSchema } from "./index.js";

const ndiout = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	name: z.string().optional(),
	audiochop: z.any().optional(),
	metadatacreate: z.boolean().optional(),
	metadatadat: z.any().optional(),
	resetstreamstate: z.boolean().optional(),
	resetstreamstatepulse: z.boolean().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { ndiout };
