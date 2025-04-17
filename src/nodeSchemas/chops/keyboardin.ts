import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const keyboardin = createCHOPSchema({
	active: z.string().optional().describe("Active"),
	keys: z.string().optional().describe("Keys"),
	modifiers: z.string().optional().describe("Modifiers"),
	channelnames: z.string().optional().describe("Channel Names"),
	panels: z.any().nullable().optional().describe("Panels"),
	rate: z.number().optional().describe("Rate"),
	left: z.string().optional().describe("Left Boundary"),
	right: z.string().optional().describe("Right Boundary"),
	defval: z.number().optional().describe("Default Value"),
});
