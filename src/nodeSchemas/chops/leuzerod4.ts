import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const leuzerod4 = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	netaddress: z.string().optional().describe("Network Address"),
	port: z.number().optional().describe("Port"),
	rod4porotocol: z.string().optional().describe("ROD4 Protocol"),
	inputcoordinate: z.string().optional().describe("Input Coordinate"),
	outputmode: z.string().optional().describe("Output Mode"),
	maxblobs: z.number().optional().describe("Max Blobs"),
	maxpointdistance: z.number().optional().describe("Max Point Distance"),
	maxblobmovement: z.number().optional().describe("Max Blob Movement"),
	areaofinterest: z.string().optional().describe("Area of Interest"),
	maxdistance: z.number().optional().describe("Max Distance"),
	lowerleft1: z.number().optional().describe("Lower Left 1"),
	lowerleft2: z.number().optional().describe("Lower Left 2"),
	upperright1: z.number().optional().describe("Upper Right 1"),
	upperright2: z.number().optional().describe("Upper Right 2"),
	allowmovementoutside: z
		.boolean()
		.optional()
		.describe("Allow Movement Outside"),
	boundingboxmask: z.any().nullable().optional().describe("Bounding Box Mask"),
	rotate: z.number().optional().describe("Rotate"),
});
