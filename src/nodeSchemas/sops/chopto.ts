import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const chopto = createSOPSchema({
	group: z.string().optional().describe("Group"),
	chop: z.union([z.string(), z.null()]).optional().describe("CHOP"),
	startposx: z.number().optional().describe("Start Position X"),
	startposy: z.number().optional().describe("Start Position Y"),
	startposz: z.number().optional().describe("Start Position Z"),
	endposx: z.number().optional().describe("End Position X"),
	endposy: z.number().optional().describe("End Position Y"),
	endposz: z.number().optional().describe("End Position Z"),
	chanscope: z.string().optional().describe("Channel Scope"),
	attscope: z.string().optional().describe("Attribute Scope"),
	mapping: z.string().optional().describe("Mapping"),
	compnml: z.boolean().optional().describe("Compute Normals"),
	comptang: z.boolean().optional().describe("Compute Tangents"),
});

export { chopto };
