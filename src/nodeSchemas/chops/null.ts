import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const nullNode = createCHOPSchema({
	cooktype: z.string().optional().describe("Cook Type"),
	checkvalues: z.boolean().optional().describe("Check Values"),
	checknames: z.boolean().optional().describe("Check Names"),
	checkrange: z.boolean().optional().describe("Check Range"),
});
