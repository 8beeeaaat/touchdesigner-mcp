import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const inNode = createSOPSchema({
	label: z.string().optional().describe("Label"),
	connectorder: z.number().optional().describe("Connect Order"),
});

export { inNode };
