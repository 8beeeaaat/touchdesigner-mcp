import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const blend = createSOPSchema({
	group: z.string().optional().describe("Group"),
	diff: z.boolean().optional().describe("Difference"),
	dopos: z.boolean().optional().describe("Blend Position"),
	doclr: z.boolean().optional().describe("Blend Color"),
	donml: z.boolean().optional().describe("Blend Normal"),
	douvw: z.boolean().optional().describe("Blend UVW"),
	doup: z.boolean().optional().describe("Blend Up"),
	input: z.number().optional().describe("Input"),
	input0weight: z.number().optional().describe("Input 0 Weight"),
});

export { blend };
