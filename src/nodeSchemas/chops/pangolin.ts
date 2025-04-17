import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const pangolin = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	source: z.string().optional().describe("Source"),
	sop: z.any().nullable().optional().describe("SOP"),
	chop: z.any().nullable().optional().describe("CHOP"),
	zone: z.number().optional().describe("Zone"),
	ratemode: z.string().optional().describe("Rate Mode"),
	percent: z.number().optional().describe("Percent"),
	rate: z.number().optional().describe("Rate"),
	repeat: z.number().optional().describe("Repeat"),
	vector: z.boolean().optional().describe("Vector"),
	resend: z.boolean().optional().describe("Resend"),
	enableout: z.boolean().optional().describe("Enable Out"),
	disableout: z.boolean().optional().describe("Disable Out"),
	blackout: z.boolean().optional().describe("Blackout"),
});
