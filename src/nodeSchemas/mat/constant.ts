import { z } from "zod";
import { createMATSchema } from "./utils.js";

const constant = createMATSchema({
	applyprojmaps: z.boolean().optional().describe("Apply Projection Maps"),
	colorr: z.number().optional().describe("Color Red"),
	colorg: z.number().optional().describe("Color Green"),
	colorb: z.number().optional().describe("Color Blue"),
	alpha: z.number().optional().describe("Alpha"),
	applypointcolor: z.boolean().optional().describe("Apply Point Color"),
	colormap: z.any().nullable().optional().describe("Color Map"),
	colormapextendu: z.string().optional().describe("Color Map Extend U"),
	colormapextendv: z.string().optional().describe("Color Map Extend V"),
	colormapextendw: z.string().optional().describe("Color Map Extend W"),
	colormapfilter: z.string().optional().describe("Color Map Filter"),
	colormapanisotropy: z.string().optional().describe("Color Map Anisotropy"),
	colormapcoord: z.string().optional().describe("Color Map Coordinate"),
	colormapcoordinterp: z
		.string()
		.optional()
		.describe("Color Map Coordinate Interpolation"),
});

export { constant };
