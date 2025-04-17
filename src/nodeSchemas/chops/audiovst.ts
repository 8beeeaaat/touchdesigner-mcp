import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiovst CHOP node parameters
 */
export const audiovst = createCHOPSchema({
	file: z.string().optional().describe("File"),
	reloadpulse: z.boolean().optional().describe("Reload Pulse"),
	loadpluginstate: z.boolean().optional().describe("Load Plugin State"),
	rate: z.number().optional().describe("Rate"),
	alwaysontop: z.boolean().optional().describe("Always On Top"),
	displaygui: z.boolean().optional().describe("Display GUI"),
	learnparms: z.boolean().optional().describe("Learn Parameters"),
	regularparms: z.boolean().optional().describe("Regular Parameters"),
	readonlyparms: z.boolean().optional().describe("Read Only Parameters"),
	clearlearnedparms: z
		.boolean()
		.optional()
		.describe("Clear Learned Parameters"),
	callbacks: z.string().optional().describe("Callbacks"),
	custombuslayout: z.boolean().optional().describe("Custom Bus Layout"),
	outputbuslayout: z.string().optional().describe("Output Bus Layout"),
	maininputlayout: z.string().optional().describe("Main Input Layout"),
	aux: z.number().optional().describe("Aux"),
	aux0enable: z.boolean().optional().describe("Aux 0 Enable"),
	aux0layout: z.string().optional().describe("Aux 0 Layout"),
	customplayhead: z.boolean().optional().describe("Custom Playhead"),
	timecodeop: z.any().optional().describe("Timecode Operator"),
	tempo: z.number().optional().describe("Tempo"),
	signature1: z.number().optional().describe("Time Signature Numerator"),
	signature2: z.number().optional().describe("Time Signature Denominator"),
});
