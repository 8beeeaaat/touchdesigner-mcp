import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const etherdream = createDATSchema({
	callbacks: z.string().optional().describe("Callbacks"),
	columns: z.string().optional().describe("Columns"),
	poll: z.boolean().optional().describe("Poll"),
	localaddress: z.string().optional().describe("Local Address"),
});
