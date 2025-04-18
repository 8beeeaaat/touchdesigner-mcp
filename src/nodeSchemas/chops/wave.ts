import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const wave = createCHOPSchema({
	wavetype: z.string().optional().describe("Wave Type"),
	period: z.number().optional().describe("Period"),
	periodunit: z.string().optional().describe("Period Unit"),
	phase: z.number().optional().describe("Phase"),
	bias: z.number().optional().describe("Bias"),
	offset: z.number().optional().describe("Offset"),
	amp: z.number().optional().describe("Amplitude"),
	decay: z.number().optional().describe("Decay"),
	decayunit: z.string().optional().describe("Decay Unit"),
	ramp: z.number().optional().describe("Ramp"),
	rampunit: z.string().optional().describe("Ramp Unit"),
	exprs: z.number().optional().describe("Expressions"),
	channelname: z.string().optional().describe("Channel Name"),
	start: z.number().optional().describe("Start"),
	startunit: z.string().optional().describe("Start Unit"),
	end: z.number().optional().describe("End"),
	endunit: z.string().optional().describe("End Unit"),
	rate: z.number().optional().describe("Rate"),
	left: z.string().optional().describe("Left Boundary"),
	right: z.string().optional().describe("Right Boundary"),
	defval: z.number().optional().describe("Default Value"),
});
