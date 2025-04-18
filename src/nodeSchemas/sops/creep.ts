import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const creep = createSOPSchema({
	reset: z.boolean().optional().describe("Reset"),
	resetmethod: z.string().optional().describe("Reset Method"),
	tx: z.number().optional().describe("Translate X"),
	ty: z.number().optional().describe("Translate Y"),
	tz: z.number().optional().describe("Translate Z"),
	rx: z.number().optional().describe("Rotate X"),
	ry: z.number().optional().describe("Rotate Y"),
	rz: z.number().optional().describe("Rotate Z"),
	sx: z.number().optional().describe("Scale X"),
	sy: z.number().optional().describe("Scale Y"),
	sz: z.number().optional().describe("Scale Z"),
});

export { creep };
