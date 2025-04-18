import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const select = createSOPSchema({
	sops: z.union([z.string(), z.null()]).optional().describe("SOPs"),
});

export { select };
