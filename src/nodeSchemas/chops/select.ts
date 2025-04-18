import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const select = createCHOPSchema({
	chops: z.any().nullable().optional().describe("CHOPs"),
	channames: z.string().optional().describe("Channel Names"),
	renamefrom: z.string().optional().describe("Rename From"),
	renameto: z.string().optional().describe("Rename To"),
	filterdigits: z.boolean().optional().describe("Filter Digits"),
	digits: z.number().optional().describe("Digits"),
	stripdigits: z.boolean().optional().describe("Strip Digits"),
	align: z.string().optional().describe("Align"),
	autoprefix: z.boolean().optional().describe("Auto Prefix"),
});
