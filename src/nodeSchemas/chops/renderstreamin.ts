import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const renderstreamin = createCHOPSchema({
	timeout: z.number().optional().describe("Timeout"),
	streamindex: z.number().optional().describe("Stream Index"),
	schemadat: z.any().nullable().optional().describe("Schema DAT"),
});
