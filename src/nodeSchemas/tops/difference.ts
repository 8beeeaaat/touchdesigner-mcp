import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const difference = createTOPSchema({
	pageindex: z.number().optional(),
	differenceoperation: z.string().optional(),
	absolutevalue: z.boolean().optional(),
	scale: z.number().optional(),
	amplify: z.boolean().optional(),
	justifyh: z.string().optional(),
	justifyv: z.string().optional(),
	extend: z.string().optional(),
});

export { difference };
