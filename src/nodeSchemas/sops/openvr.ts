import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const openvr = createSOPSchema({
	active: z.boolean().optional().describe("Active"),
	model: z.string().optional().describe("Model"),
});

export { openvr };
