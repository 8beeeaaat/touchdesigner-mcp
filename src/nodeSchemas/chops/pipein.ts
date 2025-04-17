import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const pipein = createCHOPSchema({
	mode: z.string().optional().describe("Mode"),
	address: z.string().optional().describe("Address"),
	port: z.number().optional().describe("Port"),
	active: z.boolean().optional().describe("Active"),
	queued: z.boolean().optional().describe("Queued"),
	mintarget: z.number().optional().describe("Min Target"),
	mintargetunit: z.string().optional().describe("Min Target Unit"),
	maxtarget: z.number().optional().describe("Max Target"),
	maxtargetunit: z.string().optional().describe("Max Target Unit"),
	maxqueue: z.number().optional().describe("Max Queue"),
	maxqueueunit: z.string().optional().describe("Max Queue Unit"),
	adjusttime: z.number().optional().describe("Adjust Time"),
	adjusttimeunit: z.string().optional().describe("Adjust Time Unit"),
	reset: z.boolean().optional().describe("Reset"),
	allowscripts: z.boolean().optional().describe("Allow Scripts"),
	echo: z.string().optional().describe("Echo"),
	callbacks: z.string().optional().describe("Callbacks"),
});
