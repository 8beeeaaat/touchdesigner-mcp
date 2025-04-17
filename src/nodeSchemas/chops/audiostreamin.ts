import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiostreamin CHOP node parameters
 */
export const audiostreamin = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	srctype: z.string().optional().describe("Source Type"),
	url: z.string().optional().describe("URL"),
	videostreamintop: z.any().optional().describe("Video Stream In TOP"),
	play: z.number().optional().describe("Play"),
	opentimeout: z.number().optional().describe("Open Timeout"),
	syncoffset: z.number().optional().describe("Sync Offset"),
	syncoffsetunit: z.string().optional().describe("Sync Offset Unit"),
	volume: z.number().optional().describe("Volume"),
	webrtc: z.any().optional().describe("WebRTC"),
	webrtcconnection: z.string().optional().describe("WebRTC Connection"),
	webrtctrack: z.string().optional().describe("WebRTC Track"),
});
