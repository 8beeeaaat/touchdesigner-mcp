import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const cplusplus = createTOPSchema({
	pageindex: z.number().optional(),
	plugin: z.string().optional(),
	reinit: z.boolean().optional(),
	reinitpulse: z.boolean().optional(),
	unloadplugin: z.boolean().optional(),
	antialias: z.string().optional(),
	depthbuffer: z.string().optional(),
	stencilbuffer: z.boolean().optional(),
	numcolorbufs: z.number().optional(),
});

export { cplusplus };
