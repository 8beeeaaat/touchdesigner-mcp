import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const hsvadjust = createTOPSchema({
	pageindex: z.number().optional(),
	startcolorr: z.number().optional(),
	startcolorg: z.number().optional(),
	startcolorb: z.number().optional(),
	huerange: z.number().optional(),
	huefalloff: z.number().optional(),
	saturationrange: z.number().optional(),
	saturationfalloff: z.number().optional(),
	valuerange: z.number().optional(),
	valuefalloff: z.number().optional(),
	hueoffset: z.number().optional(),
	saturationmult: z.number().optional(),
	valuemult: z.number().optional(),
});

export { hsvadjust };
