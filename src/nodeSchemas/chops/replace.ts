import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const replace = createCHOPSchema({
	length: z.string().optional().describe("Length"),
	notify: z.boolean().optional().describe("Notify"),
});
