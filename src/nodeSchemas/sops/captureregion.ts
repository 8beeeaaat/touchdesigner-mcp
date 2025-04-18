import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const captureregion = createSOPSchema({
	orient: z.string().optional().describe("Orient"),
	tx: z.number().optional().describe("Translate X"),
	ty: z.number().optional().describe("Translate Y"),
	tz: z.number().optional().describe("Translate Z"),
	theight: z.number().optional().describe("Top Height"),
	tcapx: z.number().optional().describe("Top Capture X"),
	tcapy: z.number().optional().describe("Top Capture Y"),
	tcapz: z.number().optional().describe("Top Capture Z"),
	bheight: z.number().optional().describe("Bottom Height"),
	bcapx: z.number().optional().describe("Bottom Capture X"),
	bcapy: z.number().optional().describe("Bottom Capture Y"),
	bcapz: z.number().optional().describe("Bottom Capture Z"),
	weight1: z.number().optional().describe("Weight 1"),
	weight2: z.number().optional().describe("Weight 2"),
	colorr: z.number().optional().describe("Color R"),
	colorg: z.number().optional().describe("Color G"),
	colorb: z.number().optional().describe("Color B"),
});

export { captureregion };
