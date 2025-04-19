import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const execute = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	start: z.boolean().optional().describe("Start"),
	startpulse: z.boolean().optional().describe("Start Pulse"),
	create: z.boolean().optional().describe("Create"),
	createpulse: z.boolean().optional().describe("Create Pulse"),
	exit: z.boolean().optional().describe("Exit"),
	exitpulse: z.boolean().optional().describe("Exit Pulse"),
	framestart: z.boolean().optional().describe("Frame Start"),
	framestartpulse: z.boolean().optional().describe("Frame Start Pulse"),
	frameend: z.boolean().optional().describe("Frame End"),
	frameendpulse: z.boolean().optional().describe("Frame End Pulse"),
	playstatechange: z.boolean().optional().describe("Play State Change"),
	playstatepulse: z.boolean().optional().describe("Play State Pulse"),
	devicechange: z.boolean().optional().describe("Device Change"),
	devicechangepulse: z.boolean().optional().describe("Device Change Pulse"),
	projectpresave: z.boolean().optional().describe("Project Pre-Save"),
	projectpresavepulse: z
		.boolean()
		.optional()
		.describe("Project Pre-Save Pulse"),
	projectpostsave: z.boolean().optional().describe("Project Post-Save"),
	projectpostsavepulse: z
		.boolean()
		.optional()
		.describe("Project Post-Save Pulse"),
	edit: z.boolean().optional().describe("Edit"),
	file: z.string().optional().describe("File"),
	defaultreadencoding: z.string().optional().describe("Default Read Encoding"),
	syncfile: z.boolean().optional().describe("Sync File"),
	loadonstart: z.boolean().optional().describe("Load on Start"),
	loadonstartpulse: z.boolean().optional().describe("Load on Start Pulse"),
	write: z.boolean().optional().describe("Write"),
	writepulse: z.boolean().optional().describe("Write Pulse"),
});
