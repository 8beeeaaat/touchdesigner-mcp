import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const sequenceblend = createSOPSchema({
	blend: z.number().optional().describe("Blend"),
	dopos: z.boolean().optional().describe("Blend Position"),
	doclr: z.boolean().optional().describe("Blend Color"),
	donml: z.boolean().optional().describe("Blend Normal"),
	douvw: z.boolean().optional().describe("Blend UVW"),
	doup: z.boolean().optional().describe("Blend Up"),
});

export { sequenceblend };
