import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const override = createCHOPSchema({
	match: z.string().optional().describe("Match"),
	makeindex: z.boolean().optional().describe("Make Index"),
	indexname: z.string().optional().describe("Index Name"),
	cookmonitor: z.boolean().optional().describe("Cook Monitor"),
});
