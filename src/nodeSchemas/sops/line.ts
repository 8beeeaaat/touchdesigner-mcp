import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const line = createSOPSchema({
	pax: z.number().optional().describe("Point A X"),
	pay: z.number().optional().describe("Point A Y"),
	paz: z.number().optional().describe("Point A Z"),
	pbx: z.number().optional().describe("Point B X"),
	pby: z.number().optional().describe("Point B Y"),
	pbz: z.number().optional().describe("Point B Z"),
	points: z.number().optional().describe("Points"),
	texture: z.string().optional().describe("Texture"),
});

export { line };
