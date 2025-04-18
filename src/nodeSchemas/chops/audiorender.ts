import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiorender CHOP node parameters
 */
export const audiorender = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	listenerobject: z.any().optional().describe("Listener Object"),
	sourceobject: z.any().optional().describe("Source Object"),
	outputformat: z.string().optional().describe("Output Format"),
	ambisonicsorder: z.number().optional().describe("Ambisonics Order"),
	attenuation: z.boolean().optional().describe("Attenuation"),
	mappingtable: z.any().optional().describe("Mapping Table"),
});
