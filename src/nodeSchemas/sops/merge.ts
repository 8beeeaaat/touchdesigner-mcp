import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const merge = createSOPSchema({
	sops: z.union([z.string(), z.null()]).optional().describe("SOPs"),
});

export { merge };
