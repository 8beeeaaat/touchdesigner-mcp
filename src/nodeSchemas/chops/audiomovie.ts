import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiomovie CHOP node parameters
 */
export const audiomovie = createCHOPSchema({
	play: z.boolean().optional().describe("Play"),
	moviefileintop: z.any().optional().describe("Movie File In TOP"),
	prereadlength: z.number().optional().describe("Pre-read Length"),
	prereadlengthunit: z.string().optional().describe("Pre-read Length Unit"),
	opentimeout: z.number().optional().describe("Open Timeout"),
	syncoffset: z.number().optional().describe("Sync Offset"),
	syncoffsetunit: z.string().optional().describe("Sync Offset Unit"),
	index: z.boolean().optional().describe("Index"),
	audiotrack: z.number().optional().describe("Audio Track"),
});
