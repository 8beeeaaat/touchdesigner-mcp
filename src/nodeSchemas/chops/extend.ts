import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const extend = createCHOPSchema({
	left: z.string().optional().describe("Left Boundary"),
	right: z.string().optional().describe("Right Boundary"),
	defval: z.number().optional().describe("Default Value"),
});
