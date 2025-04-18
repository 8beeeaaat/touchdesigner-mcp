import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const mouseout = createCHOPSchema({
	posu: z.string().optional().describe("Position U"),
	posv: z.string().optional().describe("Position V"),
	lbuttonname: z.string().optional().describe("Left Button Name"),
	rbuttonname: z.string().optional().describe("Right Button Name"),
	mbuttonname: z.string().optional().describe("Middle Button Name"),
	cookalways: z.boolean().optional().describe("Cook Always"),
});
