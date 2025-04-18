import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const trim = createSOPSchema({
	group: z.string().optional().describe("Group"),
	optype: z.string().optional().describe("Operation Type"),
	individual: z.boolean().optional().describe("Individual"),
	bigloop: z.boolean().optional().describe("Big Loop"),
	trimtol: z.number().optional().describe("Trim Tolerance"),
	altitude: z.number().optional().describe("Altitude"),
});

export { trim };
