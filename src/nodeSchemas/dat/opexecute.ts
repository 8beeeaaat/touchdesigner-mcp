import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const opexecute = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	op: z.any().optional().describe("Op"),
	precook: z.boolean().optional().describe("Pre Cook"),
	postcook: z.boolean().optional().describe("Post Cook"),
	destroy: z.boolean().optional().describe("Destroy"),
	flagchange: z.boolean().optional().describe("Flag Change"),
	wirechange: z.boolean().optional().describe("Wire Change"),
	namechange: z.boolean().optional().describe("Name Change"),
	pathchange: z.boolean().optional().describe("Path Change"),
	uichange: z.boolean().optional().describe("UI Change"),
	numchildrenchange: z.boolean().optional().describe("Num Children Change"),
	childrename: z.boolean().optional().describe("Children Name"),
	currentchildchange: z.boolean().optional().describe("Current Child Change"),
	extensionchange: z.boolean().optional().describe("Extension Change"),
	edit: z.boolean().optional().describe("Edit"),
	file: z.string().optional().describe("File"),
	defaultreadencoding: z.string().optional().describe("Default Read Encoding"),
	syncfile: z.boolean().optional().describe("Sync File"),
	loadonstart: z.boolean().optional().describe("Load on Start"),
	loadonstartpulse: z.boolean().optional().describe("Load on Start Pulse"),
	write: z.boolean().optional().describe("Write"),
	writepulse: z.boolean().optional().describe("Write Pulse"),
});
