import { z } from "zod";
import { createTOPSchema } from "./index.js";

const opencolorio = createTOPSchema({
	pageindex: z.number().optional(),
	configfile: z.string().optional(),
	reload: z.boolean().optional(),
	reloadpulse: z.boolean().optional(),
	inputspace: z.string().optional(),
	outputspace: z.string().optional(),
	revertinversesrgb: z.boolean().optional(),
	revertdisplay: z.string().optional(),
	revertview: z.string().optional(),
	direction: z.string().optional(),
	display: z.string().optional(),
	view: z.string().optional(),
	checklooks: z.boolean().optional(),
	looks: z.string().optional(),
	outputresolution: z.string().optional(),
	resolutionw: z.union([z.number(), z.string()]).optional(),
	resolutionh: z.union([z.number(), z.string()]).optional(),
});

export { opencolorio };
