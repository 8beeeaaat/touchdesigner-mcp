import { z } from "zod";
import { createTOPSchema } from "./index.js";

const sharedmemout = createTOPSchema({
	pageindex: z.number().optional(),
	memorymode: z.string().optional(),
	key: z.string().optional(),
	mapname: z.string().optional(),
	resetwarnings: z.boolean().optional(),
	resetwarningspulse: z.boolean().optional(),
	createifnotfound: z.boolean().optional(),
	activepoll: z.boolean().optional(),
	destpixelformat: z.string().optional(),
	dataoffsettype: z.string().optional(),
	dataalign: z.number().optional(),
	headeroffsetbytes: z.number().optional(),
	dataoffsetbytes: z.number().optional(),
	allocationmode: z.string().optional(),
	allocationmb: z.number().optional(),
});

export { sharedmemout };
