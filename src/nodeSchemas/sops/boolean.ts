import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const boolean = createSOPSchema({
	booleanop: z.string().optional().describe("Boolean Operation"),
	accattrib: z.boolean().optional().describe("Accumulate Attributes"),
	creategroup: z.boolean().optional().describe("Create Group"),
	groupa: z.string().optional().describe("Group A"),
	groupb: z.string().optional().describe("Group B"),
});

export { boolean };
