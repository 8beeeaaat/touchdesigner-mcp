import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiobinaural CHOP node parameters
 */
export const audiobinaural = createCHOPSchema({
	inputformat: z.string().optional().describe("Input Format"),
	ambisonicsorder: z.number().optional().describe("Ambisonics Order"),
	listenerobject: z.any().optional().describe("Listener Object"),
	mappingtable: z.string().optional().describe("Mapping Table"),
});
