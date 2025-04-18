import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const sort = createCHOPSchema({
	method: z.string().optional().describe("Method"),
	seed: z.number().optional().describe("Seed"),
	select: z.string().optional().describe("Select"),
	indices: z.string().optional().describe("Indices"),
	names: z.string().optional().describe("Names"),
	indexchannel: z.boolean().optional().describe("Index Channel"),
});
