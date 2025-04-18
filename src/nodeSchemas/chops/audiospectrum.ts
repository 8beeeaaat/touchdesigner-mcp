import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiospectrum CHOP node parameters
 */
export const audiospectrum = createCHOPSchema({
	mode: z.string().optional().describe("Mode"),
	fftsize: z.string().optional().describe("FFT Size"),
	frequencylog: z.number().optional().describe("Frequency Log"),
	highfreqboost: z.number().optional().describe("High Frequency Boost"),
	outputmenu: z.string().optional().describe("Output Menu"),
	outlength: z.number().optional().describe("Output Length"),
});
