import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const delay = createCHOPSchema({
	delay: z.number().optional().describe("Delay"),
	delayunit: z.string().optional().describe("Delay Unit"),
	maxdelay: z.number().optional().describe("Max Delay"),
	maxdelayunit: z.string().optional().describe("Max Delay Unit"),
});
