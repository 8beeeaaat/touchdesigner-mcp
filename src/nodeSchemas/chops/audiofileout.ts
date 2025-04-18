import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiofileout CHOP node parameters
 */
export const audiofileout = createCHOPSchema({
	filetype: z.string().optional().describe("File Type"),
	uniquesuff: z.boolean().optional().describe("Unique Suffix"),
	n: z.number().optional().describe("File Number"),
	file: z.string().optional().describe("File"),
	codec: z.string().optional().describe("Codec"),
	bitrate: z.string().optional().describe("Bit Rate"),
	record: z.boolean().optional().describe("Record"),
	pause: z.boolean().optional().describe("Pause"),
});
