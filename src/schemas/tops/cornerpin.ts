import { z } from "zod";
import { createTOPSchema } from "./index.js";

const cornerpin = createTOPSchema({
	pageindex: z.number().optional(),
	top1u: z.number().optional(),
	top1v: z.number().optional(),
	top2u: z.number().optional(),
	top2v: z.number().optional(),
	bottom1u: z.number().optional(),
	bottom1v: z.number().optional(),
	bottom2u: z.number().optional(),
	bottom2v: z.number().optional(),
	type: z.string().optional(),
	extend: z.string().optional(),
	adjust: z.string().optional(),
});

export { cornerpin };
