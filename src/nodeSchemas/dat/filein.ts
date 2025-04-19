import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const filein = createDATSchema({
	file: z.string().optional().describe("File"),
	defaultreadencoding: z.string().optional().describe("Default Read Encoding"),
	converttable: z.boolean().optional().describe("Convert Table"),
	refresh: z.boolean().optional().describe("Refresh"),
	refreshpulse: z.boolean().optional().describe("Refresh Pulse"),
});
