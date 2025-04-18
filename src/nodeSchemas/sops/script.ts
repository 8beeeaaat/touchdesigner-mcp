import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const script = createSOPSchema({
	callbacks: z.string().optional().describe("Callbacks"),
	setuppars: z.boolean().optional().describe("Setup Parameters"),
});

export { script };
