import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const inversecurve = createSOPSchema({
	chop: z.union([z.string(), z.null()]).optional().describe("CHOP"),
});

export { inversecurve };
