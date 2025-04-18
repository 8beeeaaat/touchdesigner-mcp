import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const capture = createSOPSchema({
	group: z.string().optional().describe("Group"),
	rootbone: z.union([z.string(), z.null()]).optional().describe("Root Bone"),
	weightfrom: z.string().optional().describe("Weight From"),
	captframe: z.number().optional().describe("Capture Frame"),
	color: z.string().optional().describe("Color"),
	captfile: z.string().optional().describe("Capture File"),
	savefile: z.string().optional().describe("Save File"),
	autoincr: z.boolean().optional().describe("Auto Increment"),
	savecaptfile: z.boolean().optional().describe("Save Capture File"),
	savesel: z.boolean().optional().describe("Save Selection"),
});

export { capture };
