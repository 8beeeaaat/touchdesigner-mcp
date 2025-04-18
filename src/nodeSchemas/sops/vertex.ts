import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const vertex = createSOPSchema({
	group: z.string().optional().describe("Group"),
	doclr: z.string().optional().describe("Do Color"),
	diffr: z.number().optional().describe("Diffuse R"),
	diffg: z.number().optional().describe("Diffuse G"),
	diffb: z.number().optional().describe("Diffuse B"),
	alpha: z.number().optional().describe("Alpha"),
	douvw: z.string().optional().describe("Do UVW"),
	mapu: z.number().optional().describe("Map U"),
	mapv: z.number().optional().describe("Map V"),
	mapw: z.number().optional().describe("Map W"),
	docrease: z.string().optional().describe("Do Crease"),
	attr: z.number().optional().describe("Attribute"),
	attr0name: z.string().optional().describe("Attribute 0 Name"),
	attr0type: z.string().optional().describe("Attribute 0 Type"),
	attr0value1: z.number().optional().describe("Attribute 0 Value 1"),
	attr0value2: z.number().optional().describe("Attribute 0 Value 2"),
	attr0value3: z.number().optional().describe("Attribute 0 Value 3"),
	attr0value4: z.number().optional().describe("Attribute 0 Value 4"),
});

export { vertex };
