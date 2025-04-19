import { z } from "zod";
import { createMATSchema } from "./utils.js";

const inNode = createMATSchema({
	label: z.string().optional().describe("Label"),
	connectorder: z.number().optional().describe("Connect Order"),
});

export { inNode };
