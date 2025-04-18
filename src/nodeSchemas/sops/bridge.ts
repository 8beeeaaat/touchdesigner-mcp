import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const bridge = createSOPSchema({
	group: z.string().optional().describe("Group"),
	bridge: z.string().optional().describe("Bridge"),
	inc: z.number().optional().describe("Increment"),
	order: z.number().optional().describe("Order"),
	isodivs: z.number().optional().describe("Iso Divisions"),
	frenet: z.string().optional().describe("Frenet"),
	circular: z.boolean().optional().describe("Circular"),
	rotatet1: z.number().optional().describe("Rotate T1"),
	rotatet2: z.number().optional().describe("Rotate T2"),
	rotatet3: z.number().optional().describe("Rotate T3"),
	scalet1: z.number().optional().describe("Scale T1"),
	scalet2: z.number().optional().describe("Scale T2"),
	scalet3: z.number().optional().describe("Scale T3"),
	curvature: z.boolean().optional().describe("Curvature"),
	scalec1: z.number().optional().describe("Scale C1"),
	scalec2: z.number().optional().describe("Scale C2"),
	scalec3: z.number().optional().describe("Scale C3"),
	sdivs: z.number().optional().describe("Surface Divisions"),
	tolerance: z.number().optional().describe("Tolerance"),
	csharp: z.boolean().optional().describe("C Sharp"),
});

export { bridge };
