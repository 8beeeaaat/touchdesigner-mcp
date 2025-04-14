import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const directxin = createTOPSchema({
	pageindex: z.number().optional(),
	extid: z.number().optional(),
	extidcustom: z.string().optional(),
	justid: z.boolean().optional(),
	subid: z.number().optional(),
	subidcustom: z.string().optional(),
	objpick: z.string().optional(),
	autorefresh: z.boolean().optional(),
	refreshpulse: z.boolean().optional(),
	locklevel: z.string().optional(),
	forcedresolution: z.boolean().optional(),
	channelnames: z.string().optional(),
	outputlevel: z.string().optional(),
});

export { directxin };
