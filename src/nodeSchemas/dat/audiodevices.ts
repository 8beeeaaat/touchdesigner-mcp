import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const audiodevices = createDATSchema({
	driver: z.string().optional().describe("Driver"),
	alldrivers: z.boolean().optional().describe("All Drivers"),
	input: z.boolean().optional().describe("Input"),
	output: z.boolean().optional().describe("Output"),
	callbacks: z.string().optional().describe("Callbacks"),
});
