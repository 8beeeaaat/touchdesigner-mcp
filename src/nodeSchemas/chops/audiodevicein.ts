import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiodevicein CHOP node parameters
 */
export const audiodevicein = createCHOPSchema({
	driver: z.string().optional().describe("Driver"),
	device: z.string().optional().describe("Device"),
	errormissing: z.boolean().optional().describe("Error on Missing Device"),
	inputselect: z.string().optional().describe("Input Selection"),
	inputnames: z.string().optional().describe("Input Names"),
	inputindices: z.string().optional().describe("Input Indices"),
	format: z.string().optional().describe("Format"),
	ratemode: z.string().optional().describe("Rate Mode"),
	rate: z.number().optional().describe("Sample Rate"),
	bufferlength: z.number().optional().describe("Buffer Length"),
	bufflenunit: z.string().optional().describe("Buffer Length Units"),
	numchan: z.number().optional().describe("Number of Channels"),
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
