import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const tristrip = createSOPSchema({
	group: z.string().optional().describe("Group"),
	constrainstriplength: z
		.boolean()
		.optional()
		.describe("Constrain Strip Length"),
	maxstriplength: z.number().optional().describe("Maximum Strip Length"),
});

export { tristrip };
