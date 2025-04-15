import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for geotext COMP node parameters
 */
export const geotext = createCOMPSchema({
	mode: z.string().optional(),
	text: z.string().optional(),
	specdat: z.union([z.string(), z.null()]).optional(),
	specchop: z.union([z.string(), z.null()]).optional(),
	sorted: z.boolean().optional(),
	formatcodes: z.boolean().optional(),
	escapeseq: z.boolean().optional(),
	smartpunct: z.boolean().optional(),
	wordwrap: z.boolean().optional(),

	font: z.string().optional(),
	fontfile: z.string().optional(),
	bold: z.boolean().optional(),
	italic: z.boolean().optional(),
	fontsize: z.number().optional(),
	tracking: z.number().optional(),
	skew: z.number().optional(),
	horzstretch: z.number().optional(),
	linespacing: z.number().optional(),

	fontcolorr: z.number().optional(),
	fontcolorg: z.number().optional(),
	fontcolorb: z.number().optional(),
	fontalpha: z.number().optional(),

	layoutanchoru: z.number().optional(),
	layoutanchorv: z.number().optional(),
	layoutsizew: z.number().optional(),
	layoutsizeh: z.number().optional(),
	cliptolayoutbox: z.boolean().optional(),
	textpaddingl: z.number().optional(),
	textpaddingr: z.number().optional(),
	textpaddingb: z.number().optional(),
	textpaddingt: z.number().optional(),
	alignx: z.string().optional(),
	aligny: z.string().optional(),
	alignymode: z.string().optional(),
});
