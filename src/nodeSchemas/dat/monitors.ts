import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const monitors = createDATSchema({
	callbacks: z.string().optional().describe("Callbacks"),
	bounds: z.boolean().optional().describe("Bounds"),
	monitors: z.string().optional().describe("Monitors"),
	units: z.string().optional().describe("Units"),
});
