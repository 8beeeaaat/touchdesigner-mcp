import { z } from "zod";
import { createTOPSchema } from "./index.js";

const mirror = createTOPSchema({
	pageindex: z.number().optional(),
	mode: z.string().optional(),
	axismethod: z.string().optional(),
	axisangle: z.number().optional(),
	centeru: z.number().optional(),
	centerv: z.number().optional(),
	offsetaxis: z.number().optional(),
	offsetunit: z.string().optional(),
});

export { mirror };
