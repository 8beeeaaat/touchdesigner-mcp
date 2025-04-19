import { z } from "zod";
import { createMATSchema } from "./utils.js";

const wireframe = createMATSchema({
	wirecolorr: z.number().optional().describe("Wire Color Red"),
	wirecolorg: z.number().optional().describe("Wire Color Green"),
	wirecolorb: z.number().optional().describe("Wire Color Blue"),
	wirealpha: z.number().optional().describe("Wire Alpha"),
	fillcolorr: z.number().optional().describe("Fill Color Red"),
	fillcolorg: z.number().optional().describe("Fill Color Green"),
	fillcolorb: z.number().optional().describe("Fill Color Blue"),
	fillalpha: z.number().optional().describe("Fill Alpha"),
	wirewidth: z.number().optional().describe("Wire Width"),
	applypointcolor: z.boolean().optional().describe("Apply Point Color"),
	filllighting: z.boolean().optional().describe("Fill Lighting"),
	drawwire: z.boolean().optional().describe("Draw Wire"),
	drawfill: z.boolean().optional().describe("Draw Fill"),
});

export { wireframe };
