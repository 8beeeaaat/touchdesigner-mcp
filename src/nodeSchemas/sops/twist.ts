import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const twist = createSOPSchema({
	group: z.string().optional().describe("Group"),
	op: z.string().optional().describe("Operation"),
	paxis: z.string().optional().describe("Primary Axis"),
	saxis: z.string().optional().describe("Secondary Axis"),
	px: z.number().optional().describe("Pivot X"),
	py: z.number().optional().describe("Pivot Y"),
	pz: z.number().optional().describe("Pivot Z"),
	strength: z.number().optional().describe("Strength"),
	roll: z.number().optional().describe("Roll"),
});

export { twist };
