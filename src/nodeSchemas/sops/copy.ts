import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const copy = createSOPSchema({
	sourcegrp: z.string().optional().describe("Source Group"),
	templategrp: z.string().optional().describe("Template Group"),
	ncy: z.number().optional().describe("Number of Copies"),
	nprims: z.number().optional().describe("Number of Primitives"),
	nml: z.boolean().optional().describe("Normal"),
	cum: z.boolean().optional().describe("Cumulative"),
	xord: z.string().optional().describe("Transform Order"),
	rord: z.string().optional().describe("Rotation Order"),
	tx: z.number().optional().describe("Translate X"),
	ty: z.number().optional().describe("Translate Y"),
	tz: z.number().optional().describe("Translate Z"),
	rx: z.number().optional().describe("Rotate X"),
	ry: z.number().optional().describe("Rotate Y"),
	rz: z.number().optional().describe("Rotate Z"),
	sx: z.number().optional().describe("Scale X"),
	sy: z.number().optional().describe("Scale Y"),
	sz: z.number().optional().describe("Scale Z"),
	px: z.number().optional().describe("Pivot X"),
	py: z.number().optional().describe("Pivot Y"),
	pz: z.number().optional().describe("Pivot Z"),
	scale: z.number().optional().describe("Scale"),
	vlength: z.boolean().optional().describe("Velocity Length"),
	newg: z.boolean().optional().describe("New Group"),
	copyg: z.string().optional().describe("Copy Group"),
	lookat: z.union([z.string(), z.null()]).optional().describe("Look At"),
	upvectorx: z.number().optional().describe("Up Vector X"),
	upvectory: z.number().optional().describe("Up Vector Y"),
	upvectorz: z.number().optional().describe("Up Vector Z"),
	stamp: z.boolean().optional().describe("Stamp"),
	doattr: z.boolean().optional().describe("Do Attributes"),
});

export { copy };
