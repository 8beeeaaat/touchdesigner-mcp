import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const rectangle = createTOPSchema({
	pageindex: z.number().optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	widthunit: z.string().optional(),
	heightunit: z.string().optional(),
	x: z.number().optional(),
	y: z.number().optional(),
	xyunit: z.string().optional(),
	rotate: z.number().optional(),
	justifyh: z.string().optional(),
	justifyv: z.string().optional(),
	fillcolorr: z.number().optional(),
	fillcolorg: z.number().optional(),
	fillcolorb: z.number().optional(),
	fillalpha: z.number().optional(),
	borderr: z.number().optional(),
	borderg: z.number().optional(),
	borderb: z.number().optional(),
	borderalpha: z.number().optional(),
	bgcolorr: z.number().optional(),
	bgcolorg: z.number().optional(),
	bgcolorb: z.number().optional(),
	bgalpha: z.number().optional(),
	premultrgbbyalpha: z.boolean().optional(),
	borderwidth: z.number().optional(),
	borderwidthunit: z.string().optional(),
	softness: z.number().optional(),
	softnessunit: z.string().optional(),
});

export { rectangle };
