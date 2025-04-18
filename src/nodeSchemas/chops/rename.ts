import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const rename = createCHOPSchema({
	renamefrom: z.string().optional().describe("Rename From"),
	renameto: z.string().optional().describe("Rename To"),
});
