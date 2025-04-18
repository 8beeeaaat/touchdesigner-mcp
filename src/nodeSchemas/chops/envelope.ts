import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const envelope = createCHOPSchema({
	method: z.string().optional().describe("Method"),
	bounds: z.string().optional().describe("Bounds"),
	width: z.number().optional().describe("Width"),
	widthunit: z.string().optional().describe("Width Unit"),
	interp: z.string().optional().describe("Interpolation"),
	norm: z.boolean().optional().describe("Normalize"),
	resample: z.boolean().optional().describe("Resample"),
	samplerate: z.number().optional().describe("Sample Rate"),
});
