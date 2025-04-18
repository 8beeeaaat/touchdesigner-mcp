import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const facetrack = createSOPSchema({
	chop: z.union([z.string(), z.null()]).optional().describe("CHOP"),
	directtogpu: z.boolean().optional().describe("Direct to GPU"),
	pretransform: z.boolean().optional().describe("Pre-Transform"),
});

export { facetrack };
