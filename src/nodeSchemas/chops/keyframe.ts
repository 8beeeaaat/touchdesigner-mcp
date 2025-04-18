import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const keyframe = createCHOPSchema({
	animation: z.any().nullable().optional().describe("Animation"),
	rate: z.number().optional().describe("Rate"),
	left: z.string().optional().describe("Left Boundary"),
	right: z.string().optional().describe("Right Boundary"),
	defval: z.number().optional().describe("Default Value"),
});
