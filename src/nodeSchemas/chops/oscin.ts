import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const oscin = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	protocol: z.string().optional().describe("Protocol"),
	netaddress: z.string().optional().describe("Network Address"),
	port: z.number().optional().describe("Port"),
	localaddress: z.string().optional().describe("Local Address"),
	oscaddressscope: z.string().optional().describe("OSC Address Scope"),
	useglobalrate: z.boolean().optional().describe("Use Global Rate"),
	samplerate: z.number().optional().describe("Sample Rate"),
	queued: z.boolean().optional().describe("Queued"),
	queuetarget: z.number().optional().describe("Queue Target"),
	queuetargetunit: z.string().optional().describe("Queue Target Unit"),
	queuevariance: z.number().optional().describe("Queue Variance"),
	queuevarianceunit: z.string().optional().describe("Queue Variance Unit"),
	adjusttime: z.number().optional().describe("Adjust Time"),
	adjusttimeunit: z.string().optional().describe("Adjust Time Unit"),
	stripprefixes: z.number().optional().describe("Strip Prefixes"),
	resetchannels: z.boolean().optional().describe("Reset Channels"),
	resetchannelspulse: z.boolean().optional().describe("Reset Channels Pulse"),
	resetvalues: z.boolean().optional().describe("Reset Values"),
	resetvaluespulse: z.boolean().optional().describe("Reset Values Pulse"),
});
