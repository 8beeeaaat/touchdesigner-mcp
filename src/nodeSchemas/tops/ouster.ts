import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const ouster = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	hostname: z.string().optional(),
	udpport: z.number().optional(),
	formatmode: z.string().optional(),
	resizeimage: z.boolean().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { ouster };
