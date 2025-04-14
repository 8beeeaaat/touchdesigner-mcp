import { z } from "zod";
import { createTOPSchema } from "./index.js";

const screengrab = createTOPSchema({
	pageindex: z.number().optional(),
	capturemethod: z.string().optional(),
	left: z.number().optional(),
	top: z.number().optional(),
	right: z.number().optional(),
	bottom: z.number().optional(),
	window: z.string().optional(),
	client: z.boolean().optional(),
	display: z.number().optional(),
	pixelformat: z.string().optional(),
	capturefreq: z.number().optional(),
	autorefreshrate: z.boolean().optional(),
	updateonstartup: z.boolean().optional(),
	updatepulse: z.boolean().optional(),
	realtimeupdate: z.boolean().optional(),
});

export { screengrab };
