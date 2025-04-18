import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const outChop = createCHOPSchema({
	label: z.string().optional().describe("Label"),
	connectorder: z.number().optional().describe("Connect Order"),
});
