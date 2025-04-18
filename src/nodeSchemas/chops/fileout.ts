import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const fileout = createCHOPSchema({
	pageindex: z.number().describe("Page Index"),
	file: z.string().describe("File Name"),
	interval: z.number().describe("Interval"),
	write: z.boolean().describe("Write"),
});
