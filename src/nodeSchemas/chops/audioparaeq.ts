import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audioparaeq CHOP node parameters
 */
export const audioparaeq = createCHOPSchema({
	units: z.string().optional().describe("Units"),
	enableeq1: z.boolean().optional().describe("Enable EQ 1"),
	boost1: z.number().optional().describe("Boost 1"),
	frequencylog1: z.number().optional().describe("Frequency Log 1"),
	frequencyhz1: z.number().optional().describe("Frequency Hz 1"),
	bandwidth1: z.number().optional().describe("Bandwidth 1"),
	enableeq2: z.boolean().optional().describe("Enable EQ 2"),
	boost2: z.number().optional().describe("Boost 2"),
	frequencylog2: z.number().optional().describe("Frequency Log 2"),
	frequencyhz2: z.number().optional().describe("Frequency Hz 2"),
	bandwidth2: z.number().optional().describe("Bandwidth 2"),
	enableeq3: z.boolean().optional().describe("Enable EQ 3"),
	boost3: z.number().optional().describe("Boost 3"),
	frequencylog3: z.number().optional().describe("Frequency Log 3"),
	frequencyhz3: z.number().optional().describe("Frequency Hz 3"),
	bandwidth3: z.number().optional().describe("Bandwidth 3"),
	drywet: z.number().optional().describe("Dry/Wet"),
});
