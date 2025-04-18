import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const script = createCHOPSchema({
	callbacks: z.string().optional().describe("Callbacks"),
	setuppars: z.boolean().optional().describe("Setup Parameters"),
});
