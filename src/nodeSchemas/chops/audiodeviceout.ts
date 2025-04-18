import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiodeviceout CHOP node parameters
 */
export const audiodeviceout = createCHOPSchema({
	driver: z.string().optional().describe("Driver"),
	device: z.string().optional().describe("Device"),
	errormissing: z.boolean().optional().describe("Error on Missing Device"),
	outputs: z.string().optional().describe("Outputs"),
	volume: z.number().optional().describe("Volume"),
	pan: z.number().optional().describe("Pan"),
	clampoutput: z.boolean().optional().describe("Clamp Output"),
	cookalways: z.boolean().optional().describe("Cook Always"),
	bufferlength: z.number().optional().describe("Buffer Length"),
	bufflenunit: z.string().optional().describe("Buffer Length Units"),
	adjustspeed: z.number().optional().describe("Adjust Speed"),
	frontleft: z.boolean().optional().describe("Front Left"),
	frontright: z.boolean().optional().describe("Front Right"),
	frontcenter: z.boolean().optional().describe("Front Center"),
	lowfrequency: z.boolean().optional().describe("Low Frequency"),
	backleft: z.boolean().optional().describe("Back Left"),
	backright: z.boolean().optional().describe("Back Right"),
	frontleftcenter: z.boolean().optional().describe("Front Left Center"),
	frontrightcenter: z.boolean().optional().describe("Front Right Center"),
	backcenter: z.boolean().optional().describe("Back Center"),
	sideleft: z.boolean().optional().describe("Side Left"),
	sideright: z.boolean().optional().describe("Side Right"),
	topcenter: z.boolean().optional().describe("Top Center"),
	topfrontleft: z.boolean().optional().describe("Top Front Left"),
	topfrontcenter: z.boolean().optional().describe("Top Front Center"),
	topfrontright: z.boolean().optional().describe("Top Front Right"),
	topbackleft: z.boolean().optional().describe("Top Back Left"),
	topbackcenter: z.boolean().optional().describe("Top Back Center"),
	topbackright: z.boolean().optional().describe("Top Back Right"),
});
