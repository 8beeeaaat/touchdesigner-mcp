import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const fileNode = createSOPSchema({
	file: z.string().optional().describe("File"),
	flipfacing: z.boolean().optional().describe("Flip Facing"),
	refresh: z.boolean().optional().describe("Refresh"),
	refreshpulse: z.boolean().optional().describe("Refresh Pulse"),
});

export { fileNode };
