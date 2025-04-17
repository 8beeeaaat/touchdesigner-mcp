import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiofilein CHOP node parameters
 */
export const audiofilein = createCHOPSchema({
	file: z.string().optional().describe("File"),
	reloadpulse: z.boolean().optional().describe("Reload Pulse"),
	play: z.boolean().optional().describe("Play"),
	playmode: z.string().optional().describe("Play Mode"),
	speed: z.number().optional().describe("Speed"),
	cue: z.boolean().optional().describe("Cue"),
	cuepulse: z.boolean().optional().describe("Cue Pulse"),
	cuepoint: z.number().optional().describe("Cue Point"),
	cuepointunit: z.string().optional().describe("Cue Point Unit"),
	index: z.number().optional().describe("Index"),
	indexunit: z.string().optional().describe("Index Unit"),
	timecodeop: z.any().optional().describe("Timecode Operator"),
	repeat: z.string().optional().describe("Repeat"),
	trim: z.boolean().optional().describe("Trim"),
	trimstart: z.number().optional().describe("Trim Start"),
	trimstartunit: z.string().optional().describe("Trim Start Unit"),
	trimend: z.number().optional().describe("Trim End"),
	trimendunit: z.string().optional().describe("Trim End Unit"),
	prereadlength: z.number().optional().describe("Pre-read Length"),
	prereadlengthunit: z.string().optional().describe("Pre-read Length Unit"),
	opentimeout: z.number().optional().describe("Open Timeout"),
	mono: z.boolean().optional().describe("Mono"),
	volume: z.number().optional().describe("Volume"),
	fade: z.boolean().optional().describe("Fade"),
});
