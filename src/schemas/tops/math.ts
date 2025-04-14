import { z } from "zod";
import { createTOPSchema } from "./index.js";

const math = createTOPSchema({
	pageindex: z.number().optional(),
	optype: z.string().optional(),
	multconstant: z.number().optional(),
	divconstant: z.number().optional(),
	addconstant: z.number().optional(),
	powconstant: z.number().optional(),
	modconstant: z.number().optional(),
	minconstant: z.number().optional(),
	maxconstant: z.number().optional(),
	r: z.number().optional(),
	g: z.number().optional(),
	b: z.number().optional(),
	a: z.number().optional(),
	preservealpha: z.boolean().optional(),
	justifyh: z.string().optional(),
	justifyv: z.string().optional(),
	extend: z.string().optional(),
});

export { math };
