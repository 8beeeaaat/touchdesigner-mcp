import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const parameterexecute = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	op: z.any().optional().describe("Op"),
	pars: z.string().optional().describe("Parameters"),
	valuechange: z.boolean().optional().describe("Value Change"),
	valueschanged: z.boolean().optional().describe("Values Changed"),
	onpulse: z.boolean().optional().describe("On Pulse"),
	expressionchange: z.boolean().optional().describe("Expression Change"),
	exportchange: z.boolean().optional().describe("Export Change"),
	enablechange: z.boolean().optional().describe("Enable Change"),
	modechange: z.boolean().optional().describe("Mode Change"),
	custom: z.boolean().optional().describe("Custom"),
	builtin: z.boolean().optional().describe("Built-in"),
	edit: z.boolean().optional().describe("Edit"),
	file: z.string().optional().describe("File"),
	defaultreadencoding: z.string().optional().describe("Default Read Encoding"),
	syncfile: z.boolean().optional().describe("Sync File"),
	loadonstart: z.boolean().optional().describe("Load on Start"),
	loadonstartpulse: z.boolean().optional().describe("Load on Start Pulse"),
	write: z.boolean().optional().describe("Write"),
	writepulse: z.boolean().optional().describe("Write Pulse"),
});
