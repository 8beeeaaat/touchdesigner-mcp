import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audioplay CHOP node parameters
 */
export const audioplay = createCHOPSchema({
	specifydevice: z.boolean().optional().describe("Specify Device"),
	device: z.string().optional().describe("Device"),
	errormissing: z.boolean().optional().describe("Error on Missing Device"),
	outputs: z.string().optional().describe("Outputs"),
	file: z.string().optional().describe("File"),
	datlist: z.any().optional().describe("Dat List"),
	volume: z.number().optional().describe("Volume"),
	mode: z.string().optional().describe("Mode"),
	trigger: z.boolean().optional().describe("Trigger"),
	cookalways: z.boolean().optional().describe("Cook Always"),
	stereo: z.boolean().optional().describe("Stereo"),
	frontleft: z.number().optional().describe("Front Left"),
	frontright: z.number().optional().describe("Front Right"),
	frontcenter: z.number().optional().describe("Front Center"),
	lowfrequency: z.number().optional().describe("Low Frequency"),
	backleft: z.number().optional().describe("Back Left"),
	backright: z.number().optional().describe("Back Right"),
	frontleftcenter: z.number().optional().describe("Front Left Center"),
	frontrightcenter: z.number().optional().describe("Front Right Center"),
	backcenter: z.number().optional().describe("Back Center"),
	sideleft: z.number().optional().describe("Side Left"),
	sideright: z.number().optional().describe("Side Right"),
	topcenter: z.number().optional().describe("Top Center"),
	topfrontleft: z.number().optional().describe("Top Front Left"),
	topfrontcenter: z.number().optional().describe("Top Front Center"),
	topfrontright: z.number().optional().describe("Top Front Right"),
	topbackleft: z.number().optional().describe("Top Back Left"),
	topbackcenter: z.number().optional().describe("Top Back Center"),
	topbackright: z.number().optional().describe("Top Back Right"),
});
