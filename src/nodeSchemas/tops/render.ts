import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const render = createTOPSchema({
	pageindex: z.number().optional(),
	geometry: z.any().optional(),
	cam: z.any().optional(),
	light: z.any().optional(),
	envlight: z.any().optional(),
	ssao: z.boolean().optional(),
	ssr: z.boolean().optional(),
	shadows: z.boolean().optional(),
	antialias: z.string().optional(),
	renderpickdat: z.boolean().optional(),
	pickdat: z.any().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { render };
