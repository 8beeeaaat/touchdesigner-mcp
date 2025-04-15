import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const directxout = createTOPSchema({
	pageindex: z.number().optional(),
	extid: z.number().optional(),
	extidcustom: z.string().optional(),
	justid: z.boolean().optional(),
	subid: z.number().optional(),
	subidcustom: z.string().optional(),
	objpick: z.string().optional(),
	numsrcs: z.number().optional(),
	outputlevel: z.string().optional(),
	autorefresh: z.boolean().optional(),
	refreshpulse: z.boolean().optional(),
	forceoutput: z.boolean().optional(),
	forceoutputpulse: z.boolean().optional(),
	autorefreshrate: z.number().optional(),
	refreshrate: z.number().optional(),
	channelnames: z.string().optional(),
	mipmap: z.boolean().optional(),
	mipmapquality: z.string().optional(),
	locklevel: z.string().optional(),
	lockformats: z.boolean().optional(),
	lockdims: z.boolean().optional(),
	lockchannels: z.boolean().optional(),
});

export { directxout };
