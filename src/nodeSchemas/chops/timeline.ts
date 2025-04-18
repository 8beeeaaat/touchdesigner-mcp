import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const timeline = createCHOPSchema({
	op: z.any().nullable().optional().describe("OP"),
	usetimecode: z.boolean().optional().describe("Use Timecode"),
	timecodeop: z.any().nullable().optional().describe("Timecode OP"),
	frame: z.boolean().optional().describe("Frame"),
	second: z.boolean().optional().describe("Second"),
	absframe: z.boolean().optional().describe("Absolute Frame"),
	abssecond: z.boolean().optional().describe("Absolute Second"),
	rate: z.boolean().optional().describe("Rate"),
	start: z.boolean().optional().describe("Start"),
	end: z.boolean().optional().describe("End"),
	rangestart: z.boolean().optional().describe("Range Start"),
	rangeend: z.boolean().optional().describe("Range End"),
	signature1: z.boolean().optional().describe("Signature 1"),
	signature2: z.boolean().optional().describe("Signature 2"),
	bpm: z.boolean().optional().describe("BPM"),
	play: z.boolean().optional().describe("Play"),
});
