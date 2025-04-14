import { z } from "zod";
import { createTOPSchema } from "./index.js";

const webrender = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	source: z.string().optional(),
	url: z.string().optional(),
	dat: z.any().optional(),
	reloadsrc: z.boolean().optional(),
	reload: z.boolean().optional(),
	resetcount: z.boolean().optional(),
	updatewhenloaded: z.boolean().optional(),
	alwayscook: z.boolean().optional(),
	transparent: z.boolean().optional(),
	audio: z.string().optional(),
	mediastream: z.boolean().optional(),
	maxrenderrate: z.number().optional(),
	numbuffers: z.number().optional(),
	userdir: z.string().optional(),
	options: z.string().optional(),
	autorestart: z.boolean().optional(),
	autorestartpulse: z.boolean().optional(),
});

export { webrender };
