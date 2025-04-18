import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const skin = createSOPSchema({
	uprims: z.string().optional().describe("U Primitives"),
	vprims: z.string().optional().describe("V Primitives"),
	surftype: z.string().optional().describe("Surface Type"),
	keepshape: z.boolean().optional().describe("Keep Shape"),
	closev: z.string().optional().describe("Close V"),
	force: z.boolean().optional().describe("Force"),
	orderv: z.number().optional().describe("Order V"),
	skinops: z.string().optional().describe("Skin Operations"),
	inc: z.number().optional().describe("Increment"),
	prim: z.boolean().optional().describe("Primitive"),
	polys: z.boolean().optional().describe("Polygons"),
});

export { skin };
