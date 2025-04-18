import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const openvr = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	output: z.string().optional().describe("Output"),
	maxtrackers: z.number().optional().describe("Max Trackers"),
	firsttracker: z.number().optional().describe("First Tracker"),
	orientation: z.boolean().optional().describe("Orientation"),
	recenter: z.boolean().optional().describe("Recenter"),
	generalinfo: z.boolean().optional().describe("General Info"),
	near: z.number().optional().describe("Near"),
	far: z.number().optional().describe("Far"),
	unitscale: z.number().optional().describe("Unit Scale"),
	customactions: z.boolean().optional().describe("Custom Actions"),
	actionmanifest: z.string().optional().describe("Action Manifest"),
	uselegacynames: z.boolean().optional().describe("Use Legacy Names"),
	skeletonrange: z.string().optional().describe("Skeleton Range"),
});
