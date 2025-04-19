import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const text = createDATSchema({
	edit: z.boolean().optional().describe("Edit"),
	file: z.string().optional().describe("File"),
	defaultreadencoding: z.string().optional().describe("Default Read Encoding"),
	syncfile: z.boolean().optional().describe("Sync File"),
	loadonstart: z.boolean().optional().describe("Load on Start"),
	loadonstartpulse: z.boolean().optional().describe("Load on Start Pulse"),
	write: z.boolean().optional().describe("Write"),
	writepulse: z.boolean().optional().describe("Write Pulse"),
});
