import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const table = createDATSchema({
	edit: z.boolean().optional().describe("Edit"),
	file: z.string().optional().describe("File"),
	syncfile: z.boolean().optional().describe("Sync File"),
	defaultreadencoding: z.string().optional().describe("Default Read Encoding"),
	loadonstart: z.boolean().optional().describe("Load on Start"),
	loadonstartpulse: z.boolean().optional().describe("Load on Start Pulse"),
	write: z.boolean().optional().describe("Write"),
	writepulse: z.boolean().optional().describe("Write Pulse"),
	removeblank: z.boolean().optional().describe("Remove Blank"),
	fill: z.string().optional().describe("Fill"),
	rows: z.number().optional().describe("Rows"),
	cols: z.number().optional().describe("Columns"),
	cellexpr: z.string().optional().describe("Cell Expression"),
	includenames: z.boolean().optional().describe("Include Names"),
	fills: z.number().optional().describe("Fills"),
	fills0names: z.string().optional().describe("Fills Names"),
	fills0expr: z.string().optional().describe("Fills Expression"),
});
