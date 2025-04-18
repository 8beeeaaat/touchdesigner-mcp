import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const metaball = createSOPSchema({
	modifybounds: z.boolean().optional().describe("Modify Bounds"),
	radx: z.number().optional().describe("Radius X"),
	rady: z.number().optional().describe("Radius Y"),
	radz: z.number().optional().describe("Radius Z"),
	tx: z.number().optional().describe("Translate X"),
	ty: z.number().optional().describe("Translate Y"),
	tz: z.number().optional().describe("Translate Z"),
	metaweight: z.number().optional().describe("Meta Weight"),
	kernel: z.string().optional().describe("Kernel"),
	expxy: z.number().optional().describe("Exponent XY"),
	expz: z.number().optional().describe("Exponent Z"),
	normals: z.boolean().optional().describe("Normals"),
});

export { metaball };
