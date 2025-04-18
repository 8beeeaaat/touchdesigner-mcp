import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const cross = createCHOPSchema({
	cross: z.number().optional().describe("Cross"),
});
