import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const geometry = createCHOPSchema({
	sop: z.any().nullable().optional().describe("SOP"),
	group: z.string().optional().describe("Group"),
	position: z.boolean().optional().describe("Position"),
	colorrgb: z.boolean().optional().describe("Color RGB"),
	coloralpha: z.boolean().optional().describe("Color Alpha"),
	normal: z.boolean().optional().describe("Normal"),
	textureuv: z.boolean().optional().describe("Texture UV"),
	texturew: z.boolean().optional().describe("Texture W"),
	custom: z.boolean().optional().describe("Custom"),
	pointindex: z.boolean().optional().describe("Point Index"),
	normpos: z.boolean().optional().describe("Normalized Position"),
	attribscope: z.string().optional().describe("Attribute Scope"),
	renamescope: z.string().optional().describe("Rename Scope"),
	transobj: z.any().nullable().optional().describe("Transform Object"),
	rate: z.number().optional().describe("Rate"),
});
