import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for text COMP node parameters
 */
export const text = createCOMPSchema({
	mode: z.string().optional(),
	text: z.string().optional(),
	specdat: z.union([z.string(), z.null()]).optional(),
	specchop: z.union([z.string(), z.null()]).optional(),
	type: z.string().optional(),

	formatting: z.string().optional(),
	customformatting: z.string().optional(),
	precision: z.number().optional(),
	thousandsseparator: z.string().optional(),
	framerate: z.number().optional(),
	formatcodes: z.boolean().optional(),
	escapeseq: z.boolean().optional(),
	smartpunct: z.boolean().optional(),
	wordwrap: z.boolean().optional(),

	editmode: z.string().optional(),
	shiftenter: z.boolean().optional(),
	readingdirection: z.string().optional(),
	dragdropmode: z.string().optional(),

	font: z.string().optional(),
	fontfile: z.string().optional(),
	typeface: z.string().optional(),
	bold: z.boolean().optional(),
	italic: z.boolean().optional(),
	dropshadow: z.boolean().optional(),
	scaletofit: z.string().optional(),
	fontsize: z.number().optional(),
	fontsizeunits: z.string().optional(),
	tracking: z.number().optional(),
	skew: z.number().optional(),
	horzstretch: z.number().optional(),
	linespacing: z.number().optional(),

	fontcolorr: z.number().optional(),
	fontcolorg: z.number().optional(),
	fontcolorb: z.number().optional(),
	fontalpha: z.number().optional(),

	textoffsetx: z.number().optional(),
	textoffsety: z.number().optional(),
	textoffsetunits: z.string().optional(),
	textpaddingl: z.number().optional(),
	textpaddingr: z.number().optional(),
	textpaddingb: z.number().optional(),
	textpaddingt: z.number().optional(),
	textpaddingunits: z.string().optional(),

	alignx: z.string().optional(),
	alignxmode: z.string().optional(),
	aligny: z.string().optional(),
	alignymode: z.string().optional(),
});
