import { z } from "zod";
import { createTOPSchema } from "./index.js";

const ndiin = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	source: z.string().optional(),
	sourceindex: z.number().optional(),
	findnewsource: z.boolean().optional(),
	lores: z.boolean().optional(),
	syncsource: z.string().optional(),
	syncframeratemodifier: z.string().optional(),
	syncframeratemult: z.number().optional(),
	syncframeratediv: z.number().optional(),
	restart: z.boolean().optional(),
	restartpulse: z.boolean().optional(),
	resetdropcounts: z.boolean().optional(),
	asyncresample: z.boolean().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { ndiin };
