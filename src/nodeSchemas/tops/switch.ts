import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const switchNode = createTOPSchema({
	pageindex: z.number().optional(),
	index: z.number().optional(),
	blend: z.number().optional(),
	trail: z.boolean().optional(),
	traildecay: z.number().optional(),
	trailsize: z.number().optional(),
	trailtransform: z.string().optional(),
	trailr: z.number().optional(),
	trailtx: z.number().optional(),
	trailty: z.number().optional(),
	trailtunit: z.string().optional(),
	trailsx: z.number().optional(),
	trailsy: z.number().optional(),
	trailpx: z.number().optional(),
	trailpy: z.number().optional(),
	trailpunit: z.string().optional(),
	traillegacyxform: z.boolean().optional(),
});

export { switchNode };
