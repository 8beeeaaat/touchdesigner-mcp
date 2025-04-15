import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for table COMP node parameters
 */
export const table = createCOMPSchema({
	attributes: z.string().optional(),
	rowattributes: z.union([z.string(), z.null()]).optional(),
	colattributes: z.union([z.string(), z.null()]).optional(),
	tableattributes: z.string().optional(),
	values: z.union([z.string(), z.null()]).optional(),

	tablerows: z.number().optional(),
	tablecols: z.number().optional(),
	tablealign: z.string().optional(),
	fontsizeunit: z.string().optional(),
	infoformat: z.string().optional(),
	tableoffsetx: z.number().optional(),
	tableoffsety: z.number().optional(),
	tablereset: z.boolean().optional(),

	w: z.number().optional(),
	h: z.number().optional(),
	fixedaspect: z.string().optional(),
	aspect: z.number().optional(),
	layer: z.number().optional(),

	display: z.boolean().optional(),
	enable: z.boolean().optional(),
	cursor: z.string().optional(),

	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	opacity: z.number().optional(),

	leftborder: z.string().optional(),
	rightborder: z.string().optional(),
	bottomborder: z.string().optional(),
	topborder: z.string().optional(),

	crop: z.string().optional(),
	phscrollbar: z.string().optional(),
	pvscrollbar: z.string().optional(),
	scrollbarthickness: z.number().optional(),
	scrolloverlay: z.string().optional(),
});
