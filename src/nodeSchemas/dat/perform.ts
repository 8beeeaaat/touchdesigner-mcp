import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const perform = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	activepulse: z.boolean().optional().describe("Active Pulse"),
	triggermode: z.string().optional().describe("Trigger Mode"),
	triggerthreshold: z.number().optional().describe("Trigger Threshold"),
	logcook: z.boolean().optional().describe("Log Cook"),
	logexport: z.boolean().optional().describe("Log Export"),
	logviewport: z.boolean().optional().describe("Log Viewport"),
	logmovie: z.boolean().optional().describe("Log Movie"),
	logdrawchannels: z.boolean().optional().describe("Log Draw Channels"),
	logobjectview: z.boolean().optional().describe("Log Object View"),
	logcustompanel: z.boolean().optional().describe("Log Custom Panel"),
	logmidi: z.boolean().optional().describe("Log MIDI"),
	loggraphics: z.boolean().optional().describe("Log Graphics"),
	logframelength: z.boolean().optional().describe("Log Frame Length"),
	logmisc: z.boolean().optional().describe("Log Misc"),
	logscript: z.boolean().optional().describe("Log Script"),
	logrender: z.boolean().optional().describe("Log Render"),
	callbacks: z.string().optional().describe("Callbacks"),
});
