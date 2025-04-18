import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const add = createSOPSchema({
	pointdat: z.union([z.string(), z.null()]).optional().describe("Point DAT"),
	namedattribs: z.boolean().optional().describe("Named Attributes"),
	keep: z.boolean().optional().describe("Keep Existing"),
	addpts: z.boolean().optional().describe("Add Points Only"),
	point: z.number().optional().describe("Point"),
	point0posx: z.number().optional().describe("Point 0 Position X"),
	point0posy: z.number().optional().describe("Point 0 Position Y"),
	point0posz: z.number().optional().describe("Point 0 Position Z"),
	point0weight: z.number().optional().describe("Point 0 Weight"),
	method: z.string().optional().describe("Method"),
	group: z.string().optional().describe("Group"),
	add: z.string().optional().describe("Add"),
	inc: z.number().optional().describe("Increment"),
	closedall: z.boolean().optional().describe("Close All"),
	polydat: z.union([z.string(), z.null()]).optional().describe("Polygon DAT"),
	poly: z.number().optional().describe("Polygon"),
	poly0pattern: z.string().optional().describe("Polygon 0 Pattern"),
	poly0closed: z.boolean().optional().describe("Polygon 0 Closed"),
	remove: z.boolean().optional().describe("Remove"),
});

export { add };
