import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const vioso = createTOPSchema({
	pageindex: z.number().optional(),
	configfile: z.string().optional(),
	reloadpulse: z.boolean().optional(),
	outputformat: z.string().optional(),
	projectorindex: z.number().optional(),
	layoutmaxw: z.number().optional(),
	layoutmaxh: z.number().optional(),
	filter: z.string().optional(),
	renderoffsetx: z.number().optional(),
	renderoffsety: z.number().optional(),
	renderresw: z.number().optional(),
	renderresh: z.number().optional(),
});

export { vioso };
