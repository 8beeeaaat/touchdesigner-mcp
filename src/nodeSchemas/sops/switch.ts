import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const switchNode = createSOPSchema({
	input: z.number().optional().describe("Input"),
});

export { switchNode };
