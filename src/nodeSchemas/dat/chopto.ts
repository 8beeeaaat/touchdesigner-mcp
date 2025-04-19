import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const chopto = createDATSchema({
	chop: z.any().optional().describe("CHOP"),
	names: z.boolean().optional().describe("Names"),
	latestsample: z.boolean().optional().describe("Latest Sample"),
	output: z.string().optional().describe("Output"),
});
