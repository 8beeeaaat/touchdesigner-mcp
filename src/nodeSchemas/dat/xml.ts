import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const xml = createDATSchema({
	sgml: z.boolean().optional().describe("SGML"),
	merge: z.string().optional().describe("Merge"),
	mlabel: z.string().optional().describe("MLabel"),
	label: z.string().optional().describe("Label"),
	type: z.string().optional().describe("Type"),
	text: z.string().optional().describe("Text"),
	name: z.string().optional().describe("Name"),
	value: z.string().optional().describe("Value"),
	plabel: z.string().optional().describe("PLabel"),
	ptype: z.string().optional().describe("PType"),
	ptext: z.string().optional().describe("PText"),
	pname: z.string().optional().describe("PName"),
	pvalue: z.string().optional().describe("PValue"),
	oaname: z.string().optional().describe("OA Name"),
	oavalue: z.string().optional().describe("OA Value"),
	oclabel: z.string().optional().describe("OC Label"),
	show: z.string().optional().describe("Show"),
	lprefix: z.boolean().optional().describe("LPrefix"),
});
