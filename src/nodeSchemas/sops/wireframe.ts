import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const wireframe = createSOPSchema({
	group: z.string().optional().describe("Group"),
	radius: z.number().optional().describe("Radius"),
	corners: z.boolean().optional().describe("Corners"),
	caps: z.boolean().optional().describe("Caps"),
	remove: z.boolean().optional().describe("Remove"),
	fast: z.boolean().optional().describe("Fast"),
});

export { wireframe };
