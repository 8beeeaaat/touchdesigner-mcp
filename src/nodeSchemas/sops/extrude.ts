import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const extrude = createSOPSchema({
	sourcegrp: z.string().optional().describe("Source Group"),
	xsectiongrp: z.string().optional().describe("Cross-Section Group"),
	dofuse: z.string().optional().describe("Fuse"),
	fronttype: z.string().optional().describe("Front Type"),
	backtype: z.string().optional().describe("Back Type"),
	sidetype: z.string().optional().describe("Side Type"),
	initextrude: z.boolean().optional().describe("Initialize Extrusion"),
	thickxlate: z.number().optional().describe("Thickness Translate"),
	thickscale: z.number().optional().describe("Thickness Scale"),
	depthxlate: z.number().optional().describe("Depth Translate"),
	depthscale: z.number().optional().describe("Depth Scale"),
	vertex: z.number().optional().describe("Vertex"),
	docusp: z.boolean().optional().describe("Do Cusp"),
	cuspangle: z.number().optional().describe("Cusp Angle"),
	sharefaces: z.boolean().optional().describe("Share Faces"),
	removesharedsides: z.boolean().optional().describe("Remove Shared Sides"),
	newg: z.boolean().optional().describe("Create New Groups"),
	frontgrp: z.string().optional().describe("Front Group"),
	backgrp: z.string().optional().describe("Back Group"),
	sidegrp: z.string().optional().describe("Side Group"),
});

export { extrude };
