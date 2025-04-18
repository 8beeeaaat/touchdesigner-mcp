import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const expression = createCHOPSchema({
	chanperexpr: z.number().optional().describe("Channels per Expression"),
	limitexpr: z.boolean().optional().describe("Limit Output Channels"),
	limitnum: z.number().optional().describe("Number of Channels"),
	expr: z.number().optional().describe("Expression Index"),
	expr0expr: z.any().optional().describe("Expression 1 Formula"),
	expr1expr: z.any().optional().describe("Expression 2 Formula"),
	expr2expr: z.any().optional().describe("Expression 3 Formula"),
	expr3expr: z.any().optional().describe("Expression 4 Formula"),
	expr4expr: z.any().optional().describe("Expression 5 Formula"),
	expr5expr: z.any().optional().describe("Expression 6 Formula"),
});
