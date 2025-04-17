import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiostreamout CHOP node parameters
 */
export const audiostreamout = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	mode: z.string().optional().describe("Mode"),
	port: z.number().optional().describe("Port"),
	streamname: z.string().optional().describe("Stream Name"),
	webrtc: z.any().optional().describe("WebRTC"),
	webrtcconnection: z.string().optional().describe("WebRTC Connection"),
	webrtctrack: z.string().optional().describe("WebRTC Track"),
});
