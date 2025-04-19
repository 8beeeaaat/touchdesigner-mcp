import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const script = createDATSchema({
	callbacks: z.string().optional().describe("Callbacks"),
	setuppars: z.boolean().optional().describe("Setup Parameters"),
});
