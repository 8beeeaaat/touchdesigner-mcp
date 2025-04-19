import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const chopexecute = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	chop: z.any().optional().describe("CHOP"),
	channel: z.string().optional().describe("Channel"),
	offtoon: z.boolean().optional().describe("Off to On"),
	whileon: z.boolean().optional().describe("While On"),
	ontooff: z.boolean().optional().describe("On to Off"),
	whileoff: z.boolean().optional().describe("While Off"),
	valuechange: z.boolean().optional().describe("Value Change"),
	freq: z.string().optional().describe("Frequency"),
	edit: z.boolean().optional().describe("Edit"),
	file: z.string().optional().describe("File"),
	defaultreadencoding: z.string().optional().describe("Default Read Encoding"),
	syncfile: z.boolean().optional().describe("Sync File"),
	loadonstart: z.boolean().optional().describe("Load on Start"),
	loadonstartpulse: z.boolean().optional().describe("Load on Start Pulse"),
	write: z.boolean().optional().describe("Write"),
	writepulse: z.boolean().optional().describe("Write Pulse"),
});
