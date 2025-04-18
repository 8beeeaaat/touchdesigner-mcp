import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for blobtrack CHOP node parameters
 */
export const blobtrack = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	searchmode: z.number().optional().describe("Search Mode"),
	maxblobs: z.number().optional().describe("Max Blobs"),
	maxpointdistance: z.number().optional().describe("Max Point Distance"),
	maxblobmovement: z.number().optional().describe("Max Blob Movement"),
	areaofinterest: z.string().optional().describe("Area of Interest"),
	centerx: z.number().optional().describe("Center X"),
	centery: z.number().optional().describe("Center Y"),
	sizex: z.number().optional().describe("Size X"),
	sizey: z.number().optional().describe("Size Y"),
	rotate: z.number().optional().describe("Rotate"),
	allowmovementoutside: z
		.boolean()
		.optional()
		.describe("Allow Movement Outside"),
	outputcentroid: z.boolean().optional().describe("Output Centroid"),
	outputvelocity: z.boolean().optional().describe("Output Velocity"),
	minblobpoints: z.number().optional().describe("Min Blob Points"),
	blobinittime: z.number().optional().describe("Blob Init Time"),
	lostblobtimeout: z.number().optional().describe("Lost Blob Timeout"),
	predicttype: z.string().optional().describe("Predict Type"),
});
