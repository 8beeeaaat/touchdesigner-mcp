import { z } from "zod";
import { createTOPSchema } from "./index.js";

const sharedmemin = createTOPSchema({
	pageindex: z.number().optional(),
	memorymode: z.string().optional(),
	key: z.string().optional(),
	mapname: z.string().optional(),
	resetwarnings: z.boolean().optional(),
	resetwarningspulse: z.boolean().optional(),
	waitconnectiontimeout: z.number().optional(),
	createifnotfound: z.boolean().optional(),
	srcrect: z.string().optional(),
	srcrectx: z.number().optional(),
	srcrecty: z.number().optional(),
	srcrectw: z.number().optional(),
	srcrecth: z.number().optional(),
	headeroffsetbytes: z.number().optional(),
	dataoffsetbytes: z.number().optional(),
	widthbytes: z.number().optional(),
	resw: z.number().optional(),
	resh: z.number().optional(),
	format: z.string().optional(),
});

export { sharedmemin };
