import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const lumablur = createTOPSchema({
	pageindex: z.number().optional(),
	luma: z.string().optional(),
	brighttype: z.string().optional(),
	brightmax: z.number().optional(),
	brightmin: z.number().optional(),
	type: z.string().optional(),
	extend: z.string().optional(),
	size: z.number().optional(),
	darktype: z.string().optional(),
	darkmax: z.number().optional(),
	darkmin: z.number().optional(),
});

export { lumablur };
