import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const videostreamin = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	mode: z.string().optional(),
	url: z.string().optional(),
	reload: z.boolean().optional(),
	reloadpulse: z.boolean().optional(),
	play: z.boolean().optional(),
	deinterlace: z.string().optional(),
	precedence: z.string().optional(),
	bottomhalfalpha: z.boolean().optional(),
	prereadframes: z.number().optional(),
	maxdecodecpus: z.number().optional(),
	networkbuffersize: z.number().optional(),
	networkqueuesize: z.number().optional(),
	disablebuffering: z.boolean().optional(),
	hwdecode: z.boolean().optional(),
	webrtc: z.any().optional(),
	webrtcconnection: z.string().optional(),
	webrtctrack: z.string().optional(),
});

export { videostreamin };
