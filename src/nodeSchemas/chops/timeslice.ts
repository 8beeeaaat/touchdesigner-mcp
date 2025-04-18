import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const timeslice = createCHOPSchema({
	method: z.string().optional().describe("Method"),
	quatrot: z.boolean().optional().describe("Quaternion Rotation"),
});
