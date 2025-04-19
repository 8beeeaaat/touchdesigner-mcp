import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const top = createDATSchema({
	top: z.any().optional().describe("TOP"),
	datformat: z.string().optional().describe("DAT Format"),
	pixformat: z.string().optional().describe("Pixel Format"),
	resolution: z.string().optional().describe("Resolution"),
});
