import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const level = createTOPSchema({
	pageindex: z.number().optional(),
	clampinput: z.string().optional(),
	invert: z.number().optional(),
	blacklevel: z.number().optional(),
	brightness1: z.number().optional(),
	gamma1: z.number().optional(),
	contrast: z.number().optional(),
	inlow: z.number().optional(),
	inhigh: z.number().optional(),
	outlow: z.number().optional(),
	outhigh: z.number().optional(),
	lowr: z.number().optional(),
	highr: z.number().optional(),
	lowg: z.number().optional(),
	highg: z.number().optional(),
	lowb: z.number().optional(),
	highb: z.number().optional(),
	lowa: z.number().optional(),
	higha: z.number().optional(),
	stepping: z.boolean().optional(),
	stepsize: z.number().optional(),
	threshold: z.number().optional(),
	clamplow: z.number().optional(),
	clamphigh: z.number().optional(),
	soften: z.number().optional(),
	gamma2: z.number().optional(),
	opacity: z.number().optional(),
	brightness2: z.number().optional(),
	clamp: z.boolean().optional(),
	clamplow2: z.number().optional(),
	clamphigh2: z.number().optional(),
	premultrgbbyalpha: z.boolean().optional(),
});

export { level };
