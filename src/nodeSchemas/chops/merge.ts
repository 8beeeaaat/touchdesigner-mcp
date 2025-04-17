import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const merge = createCHOPSchema({
	align: z.string().optional().describe("Align"),
	duplicate: z.string().optional().describe("Duplicate"),
});
