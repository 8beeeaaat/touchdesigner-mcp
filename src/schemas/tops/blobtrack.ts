import { z } from "zod";
import { createTOPSchema } from "./index.js";

const blobtrack = createTOPSchema({
	pageindex: z.number().optional(),
	reset: z.boolean().optional(),
	resetpulse: z.boolean().optional(),
	monosource: z.string().optional(),
	drawblobs: z.boolean().optional(),
	blobcolorr: z.number().optional(),
	blobcolorg: z.number().optional(),
	blobcolorb: z.number().optional(),
	threshold: z.number().optional(),
	callbacks: z.string().optional(),
	masktop: z.any().optional(),
	minblobsize: z.number().optional(),
	maxblobsize: z.number().optional(),
	maxmovedistance: z.number().optional(),
	deletenearby: z.boolean().optional(),
	deletedist: z.number().optional(),
	deletenearbytol: z.number().optional(),
	deleteoverlap: z.boolean().optional(),
	deleteoverlaptol: z.number().optional(),
	reviveblobs: z.boolean().optional(),
	revivetime: z.number().optional(),
	revivearea: z.number().optional(),
	revivedistance: z.number().optional(),
	includelost: z.boolean().optional(),
	includeexpired: z.boolean().optional(),
	expiredtime: z.number().optional(),
});

export { blobtrack };
