import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const inNode = createCHOPSchema({
	label: z.string().optional().describe("Label"),
	connectorder: z.number().optional().describe("Connect Order"),
	specifynum: z.boolean().optional().describe("Specify Number"),
	numchannels: z.number().optional().describe("Number of Channels"),
	channames: z.string().optional().describe("Channel Names"),
});
