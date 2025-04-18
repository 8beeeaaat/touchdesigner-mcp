import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const deleteNode = createSOPSchema({
	group: z.string().optional().describe("Group"),
	negate: z.string().optional().describe("Negate"),
	entity: z.string().optional().describe("Entity"),
	geotype: z.string().optional().describe("Geometry Type"),
	removegrp: z.boolean().optional().describe("Remove Group"),
	keeppoints: z.boolean().optional().describe("Keep Points"),
	usenumber: z.boolean().optional().describe("Use Number"),
	groupop: z.string().optional().describe("Group Operation"),
	pattern: z.string().optional().describe("Pattern"),
	rangestart: z.number().optional().describe("Range Start"),
	rangeend: z.union([z.string(), z.number()]).optional().describe("Range End"),
	select1: z.number().optional().describe("Select 1"),
	select2: z.number().optional().describe("Select 2"),
	filter: z.number().optional().describe("Filter"),
	usebounds: z.boolean().optional().describe("Use Bounds"),
	boundtype: z.string().optional().describe("Bound Type"),
	sizex: z.number().optional().describe("Size X"),
	sizey: z.number().optional().describe("Size Y"),
	sizez: z.number().optional().describe("Size Z"),
	usenormal: z.boolean().optional().describe("Use Normal"),
	dirx: z.number().optional().describe("Direction X"),
	diry: z.number().optional().describe("Direction Y"),
	dirz: z.number().optional().describe("Direction Z"),
	angle: z.number().optional().describe("Angle"),
	camera: z.union([z.string(), z.null()]).optional().describe("Camera"),
});

export { deleteNode };
