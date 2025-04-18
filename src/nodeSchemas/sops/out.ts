import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const out = createSOPSchema({
	label: z.string().optional().describe("Label"),
	connectorder: z.number().optional().describe("Connect Order"),
});

export { out };
