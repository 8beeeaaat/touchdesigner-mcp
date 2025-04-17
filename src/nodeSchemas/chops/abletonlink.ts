import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for abletonlink CHOP node parameters
 */
export const abletonlink = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	enable: z.boolean().optional().describe("Enable"),
	startstopsync: z.boolean().optional().describe("Start/Stop Sync"),
	signature1: z.number().optional().describe("Time Signature Numerator"),
	signature2: z.number().optional().describe("Time Signature Denominator"),
	callbacks: z.string().optional().describe("Callbacks"),
	status: z.boolean().optional().describe("Status"),
	ramp: z.boolean().optional().describe("Ramp"),
	pulse: z.boolean().optional().describe("Pulse"),
	sine: z.boolean().optional().describe("Sine"),
	count: z.boolean().optional().describe("Count"),
	countramp: z.boolean().optional().describe("Count Ramp"),
	bar: z.boolean().optional().describe("Bar"),
	beat: z.boolean().optional().describe("Beat"),
	sixteenths: z.boolean().optional().describe("Sixteenths"),
	rampbar: z.boolean().optional().describe("Ramp Bar"),
	rampbeat: z.boolean().optional().describe("Ramp Beat"),
	tempo: z.boolean().optional().describe("Tempo"),
	beats: z.boolean().optional().describe("Beats"),
	phase: z.boolean().optional().describe("Phase"),
	timeslice: z.boolean().optional().describe("Time Slice"),
	scope: z.string().optional().describe("Scope"),
	srselect: z.string().optional().describe("Sample Rate Select"),
	exportmethod: z.string().optional().describe("Export Method"),
	autoexportroot: z.string().optional().describe("Auto Export Root"),
	exporttable: z.any().optional().describe("Export Table"),
});
