import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const transpose = createDATSchema({
	// Transpose has no specific parameters beyond the common DAT parameters
});
