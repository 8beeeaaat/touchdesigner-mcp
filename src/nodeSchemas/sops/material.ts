import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const material = createSOPSchema({
	mat: z.union([z.string(), z.null()]).optional().describe("Material"),
});

export { material };
