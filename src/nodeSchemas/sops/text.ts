import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const text = createSOPSchema({
	font: z.string().optional().describe("Font"),
	fontfile: z.string().optional().describe("Font File"),
	bold: z.boolean().optional().describe("Bold"),
	italic: z.boolean().optional().describe("Italic"),
	fontsizex: z.number().optional().describe("Font Size X"),
	fontsizey: z.number().optional().describe("Font Size Y"),
	keepfontratio: z.boolean().optional().describe("Keep Font Ratio"),
	scalefonttobboxheight: z
		.boolean()
		.optional()
		.describe("Scale Font to Bounding Box Height"),
	output: z.string().optional().describe("Output"),
	levelofdetail: z.number().optional().describe("Level of Detail"),
	extrude: z.boolean().optional().describe("Extrude"),
	extrudedepth: z.number().optional().describe("Extrude Depth"),
	breaklang: z.string().optional().describe("Break Language"),
	readingdirection: z.string().optional().describe("Reading Direction"),
	tracking1: z.number().optional().describe("Tracking 1"),
	tracking2: z.number().optional().describe("Tracking 2"),
	linespacing: z.number().optional().describe("Line Spacing"),
	alignx: z.string().optional().describe("Align X"),
	aligny: z.string().optional().describe("Align Y"),
	wordwrap: z.boolean().optional().describe("Word Wrap"),
	wordwrapsize: z.number().optional().describe("Word Wrap Size"),
	smartpunct: z.boolean().optional().describe("Smart Punctuation"),
	text: z.string().optional().describe("Text"),
	legacyparsing: z.boolean().optional().describe("Legacy Parsing"),
	xord: z.string().optional().describe("Transform Order"),
	sx: z.number().optional().describe("Scale X"),
	sy: z.number().optional().describe("Scale Y"),
	sz: z.number().optional().describe("Scale Z"),
	px: z.number().optional().describe("Pivot X"),
	py: z.number().optional().describe("Pivot Y"),
	pz: z.number().optional().describe("Pivot Z"),
});

export { text };
