import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const oakdevice = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	sensor: z.string().optional().describe("Sensor"),
	refreshpulse: z.boolean().optional().describe("Refresh Pulse"),
	initialize: z.boolean().optional().describe("Initialize"),
	start: z.boolean().optional().describe("Start"),
	play: z.boolean().optional().describe("Play"),
	gotodone: z.boolean().optional().describe("Go To Done"),
	callbacks: z.string().optional().describe("Callbacks"),
	stream: z.number().optional().describe("Stream"),
	stream0name: z.string().optional().describe("Stream 0 Name"),
	stream0frequency: z.number().optional().describe("Stream 0 Frequency"),
	stream0top: z.any().nullable().optional().describe("Stream 0 TOP"),
	outinit: z.boolean().optional().describe("Out Init"),
	outinitfail: z.boolean().optional().describe("Out Init Fail"),
	outready: z.boolean().optional().describe("Out Ready"),
	outrunning: z.boolean().optional().describe("Out Running"),
	outdone: z.boolean().optional().describe("Out Done"),
	outtimercount: z.string().optional().describe("Out Timer Count"),
	outrunningcount: z.string().optional().describe("Out Running Count"),
});
