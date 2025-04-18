import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const attribute = createSOPSchema({
	ptdel: z.string().optional().describe("Point Delete"),
	pt: z.number().optional().describe("Point"),
	pt0from: z.string().optional().describe("Point 0 From"),
	pt0to: z.string().optional().describe("Point 0 To"),
	vertdel: z.string().optional().describe("Vertex Delete"),
	vert: z.number().optional().describe("Vertex"),
	vert0from: z.string().optional().describe("Vertex 0 From"),
	vert0to: z.string().optional().describe("Vertex 0 To"),
	primdel: z.string().optional().describe("Primitive Delete"),
	prim: z.number().optional().describe("Primitive"),
	prim0from: z.string().optional().describe("Primitive 0 From"),
	prim0to: z.string().optional().describe("Primitive 0 To"),
	attrdel: z.string().optional().describe("Attribute Delete"),
	attr: z.number().optional().describe("Attribute"),
	attr0from: z.string().optional().describe("Attribute 0 From"),
	attr0to: z.string().optional().describe("Attribute 0 To"),
});

export { attribute };
