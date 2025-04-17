import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const touchin = createCHOPSchema({
	protocol: z.string().optional().describe("Protocol"),
	address: z.string().optional().describe("Address"),
	port: z.number().optional().describe("Port"),
	queuetarget: z.number().optional().describe("Queue Target"),
	queuetargetunit: z.string().optional().describe("Queue Target Unit"),
	queuevariance: z.number().optional().describe("Queue Variance"),
	queuevarianceunit: z.string().optional().describe("Queue Variance Unit"),
	maxqueue: z.number().optional().describe("Max Queue"),
	maxqueueunit: z.string().optional().describe("Max Queue Unit"),
	adjusttime: z.number().optional().describe("Adjust Time"),
	adjusttimeunit: z.string().optional().describe("Adjust Time Unit"),
	recover: z.boolean().optional().describe("Recover"),
	syncports: z.string().optional().describe("Sync Ports"),
});
