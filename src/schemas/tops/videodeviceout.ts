import { z } from "zod";
import { createTOPSchema } from "./index.js";

const videodeviceout = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	driver: z.string().optional(),
	device: z.string().optional(),
	allowfallback: z.boolean().optional(),
	syncgen: z.string().optional(),
	resetstats: z.boolean().optional(),
	premultrgbbyalpha: z.boolean().optional(),
	syncdelay: z.number().optional(),
	fieldpol: z.string().optional(),
	pixelformat: z.string().optional(),
	custompixelformat: z.string().optional(),
	syncmethod: z.string().optional(),
	syncmodeswitch: z.string().optional(),
	syncsource: z.string().optional(),
	outputmode: z.string().optional(),
	ptzcontrol: z.string().optional(),
	exposure: z.string().optional(),
	outputresolution: z.string().optional(),
	signal: z.string().optional(),
});

export { videodeviceout };
