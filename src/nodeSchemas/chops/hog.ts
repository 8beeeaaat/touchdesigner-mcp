import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const hog = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	cookalways: z.boolean().optional().describe("Cook Always"),
	delay: z.number().optional().describe("Delay"),
	delayunit: z.string().optional().describe("Delay Unit"),
});
