import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const normalmap = createTOPSchema({
	pageindex: z.number().optional(),
	inputmap: z.string().optional(),
	operation: z.string().optional(),
	convolutions: z.string().optional(),
	invertx: z.boolean().optional(),
	inverty: z.boolean().optional(),
	scale: z.number().optional(),
	flipred: z.boolean().optional(),
	flipgreen: z.boolean().optional(),
	flipblue: z.boolean().optional(),
	method: z.string().optional(),
	normalvectoroutput: z.boolean().optional(),
	zscale: z.number().optional(),
	edgemode: z.string().optional(),
});

export { normalmap };
