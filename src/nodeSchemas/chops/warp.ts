import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const warp = createCHOPSchema({
	method: z.string().optional().describe("Method"),
	scaleindex: z.boolean().optional().describe("Scale Index"),
});
