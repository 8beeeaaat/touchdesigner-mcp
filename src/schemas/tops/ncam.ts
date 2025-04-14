import { z } from "zod";
import { createTOPSchema } from "./index.js";

const ncam = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	server: z.string().optional(),
	serverport: z.number().optional(),
	ncamchop: z.any().optional(),
	autorefresh: z.boolean().optional(),
	refreshpulse: z.boolean().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { ncam };
