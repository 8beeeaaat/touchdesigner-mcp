import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const stypeout = createCHOPSchema({
	protocol: z.string().optional().describe("Protocol"),
	netaddress: z.string().optional().describe("Network Address"),
	port: z.number().optional().describe("Port"),
	localaddress: z.string().optional().describe("Local Address"),
	timecodeop: z.any().nullable().optional().describe("Timecode OP"),
	packetnumber: z.string().optional().describe("Packet Number"),
});
