import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const mpcdi = createDATSchema({
	file: z.string().optional().describe("File"),
	reloadpulse: z.boolean().optional().describe("Reload Pulse"),
	outputby: z.string().optional().describe("Output By"),
	bufferid: z.string().optional().describe("Buffer ID"),
	regionid: z.string().optional().describe("Region ID"),
	near: z.number().optional().describe("Near"),
	far: z.number().optional().describe("Far"),
});
