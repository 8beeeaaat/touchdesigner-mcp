import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const hole = createSOPSchema({
	group: z.string().optional().describe("Group"),
	unbridge: z.boolean().optional().describe("Unbridge"),
	dist: z.number().optional().describe("Distance"),
	angle: z.number().optional().describe("Angle"),
	snap: z.boolean().optional().describe("Snap"),
});

export { hole };
