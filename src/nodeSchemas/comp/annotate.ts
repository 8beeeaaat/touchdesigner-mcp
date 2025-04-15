import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for annotate COMP node parameters
 */
export const annotate = createCOMPSchema({
	encloseops: z.boolean().optional(),
	utility: z.boolean().optional(),
	includeinorder: z.boolean().optional(),
	order: z.number().optional(),
	layerzone: z.string().optional(),
	layer: z.number().optional(),

	Titletext: z.string().optional(),
	Titleheight: z.number().optional(),
	Titlealign: z.string().optional(),
	Bodytext: z.string().optional(),
	Bodyfontsize: z.number().optional(),
	Bodylimitwidth: z.boolean().optional(),
	Bodymaxwidth: z.number().optional(),
	Mode: z.string().optional(),
	Smartquote: z.boolean().optional(),
	Bodywordwrap: z.boolean().optional(),

	Backcolorr: z.number().optional(),
	Backcolorg: z.number().optional(),
	Backcolorb: z.number().optional(),
	Backcoloralpha: z.number().optional(),
	Opacity: z.number().optional(),
});
