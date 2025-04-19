import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const mediafileinfo = createDATSchema({
	file: z.string().optional().describe("File"),
	topchop: z.any().optional().describe("TOP/CHOP"),
	reloadpulse: z.boolean().optional().describe("Reload Pulse"),
	opentimeout: z.number().optional().describe("Open Timeout"),
	transpose: z.boolean().optional().describe("Transpose"),
});
