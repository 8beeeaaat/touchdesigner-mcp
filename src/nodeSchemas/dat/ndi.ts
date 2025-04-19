import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const ndi = createDATSchema({
	callbacks: z.string().optional().describe("Callbacks"),
	extraips: z.string().optional().describe("Extra IPs"),
	persistence: z.number().optional().describe("Persistence"),
});
