import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const sprite = createSOPSchema({
	xyzchop: z.any().nullable().optional().describe("XYZ CHOP"),
	camera: z.any().nullable().optional().describe("Camera"),
	widthchop: z.any().nullable().optional().describe("Width CHOP"),
	colorchop: z.any().nullable().optional().describe("Color CHOP"),
	alphachop: z.any().nullable().optional().describe("Alpha CHOP"),
	perspectivewidth: z.number().optional().describe("Perspective Width"),
	constantwidth: z.number().optional().describe("Constant Width"),
	constantwidthnear: z.number().optional().describe("Constant Width Near"),
	constantwitdhfar: z.number().optional().describe("Constant Width Far"),
	falloffstart: z.number().optional().describe("Falloff Start"),
	falloffend: z.number().optional().describe("Falloff End"),
});

export { sprite };
