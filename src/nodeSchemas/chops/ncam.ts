import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const ncam = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	protocol: z.string().optional().describe("Protocol"),
	netaddress: z.string().optional().describe("Network Address"),
	port: z.number().optional().describe("Port"),
	cameraview: z.string().optional().describe("Camera View"),
	cameraproj: z.string().optional().describe("Camera Projection"),
	cameraprops: z.string().optional().describe("Camera Properties"),
	timecode: z.string().optional().describe("Timecode"),
});
