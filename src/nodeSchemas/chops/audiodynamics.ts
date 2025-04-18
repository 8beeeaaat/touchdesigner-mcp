import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiodynamics CHOP node parameters
 */
export const audiodynamics = createCHOPSchema({
	inputgain: z.number().optional().describe("Input Gain"),
	enablecompressor: z.boolean().optional().describe("Enable Compressor"),
	compressiontype: z.string().optional().describe("Compression Type"),
	chanlinkingcomp: z.string().optional().describe("Channel Linking Compressor"),
	thresholdcompressor: z.number().optional().describe("Threshold Compressor"),
	ratiocompressor: z.number().optional().describe("Ratio Compressor"),
	kneecompressor: z.number().optional().describe("Knee Compressor"),
	attackcompressor: z.number().optional().describe("Attack Compressor"),
	releasecompressor: z.number().optional().describe("Release Compressor"),
	gaincompressor: z.number().optional().describe("Gain Compressor"),
	enablelimiter: z.boolean().optional().describe("Enable Limiter"),
	chanlinkinglim: z.string().optional().describe("Channel Linking Limiter"),
	thresholdlimiter: z.number().optional().describe("Threshold Limiter"),
	releaselimiter: z.number().optional().describe("Release Limiter"),
	kneelimiter: z.number().optional().describe("Knee Limiter"),
	drywet: z.number().optional().describe("Dry/Wet"),
});
