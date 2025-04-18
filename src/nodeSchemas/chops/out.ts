import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const outNode = createCHOPSchema({
	label: z.string().optional().describe("Label"),
	connectorder: z.number().optional().describe("Connect Order"),
});
