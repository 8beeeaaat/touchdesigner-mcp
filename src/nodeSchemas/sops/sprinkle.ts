import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const sprinkle = createSOPSchema({
	seed: z.number().optional().describe("Seed"),
	method: z.string().optional().describe("Method"),
	numpoints: z.number().optional().describe("Number of Points"),
	consolidate: z.boolean().optional().describe("Consolidate"),
	neardist: z.number().optional().describe("Near Distance"),
	surfattribs: z.boolean().optional().describe("Surface Attributes"),
});

export { sprinkle };
