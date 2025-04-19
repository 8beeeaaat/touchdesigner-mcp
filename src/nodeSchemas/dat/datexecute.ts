import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const datexecute = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	dat: z.any().optional().describe("DAT"),
	tablechange: z.boolean().optional().describe("Table Change"),
	rowchange: z.boolean().optional().describe("Row Change"),
	colchange: z.boolean().optional().describe("Column Change"),
	cellchange: z.boolean().optional().describe("Cell Change"),
	sizechange: z.boolean().optional().describe("Size Change"),
	execute: z.string().optional().describe("Execute"),
	edit: z.boolean().optional().describe("Edit"),
	file: z.string().optional().describe("File"),
	defaultreadencoding: z.string().optional().describe("Default Read Encoding"),
	syncfile: z.boolean().optional().describe("Sync File"),
	loadonstart: z.boolean().optional().describe("Load on Start"),
	loadonstartpulse: z.boolean().optional().describe("Load on Start Pulse"),
	write: z.boolean().optional().describe("Write"),
	writepulse: z.boolean().optional().describe("Write Pulse"),
});
