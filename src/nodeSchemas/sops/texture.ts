import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const texture = createSOPSchema({
	group: z.string().optional().describe("Group"),
	texlayer: z.number().optional().describe("Texture Layer"),
	type: z.string().optional().describe("Type"),
	axis: z.string().optional().describe("Axis"),
	camera: z.any().nullable().optional().describe("Camera"),
	cameraaspectx: z.number().optional().describe("Camera Aspect X"),
	cameraaspecty: z.number().optional().describe("Camera Aspect Y"),
	applyto: z.string().optional().describe("Apply To"),
	su: z.number().optional().describe("Scale U"),
	sv: z.number().optional().describe("Scale V"),
	sw: z.number().optional().describe("Scale W"),
	offsetu: z.number().optional().describe("Offset U"),
	offsetv: z.number().optional().describe("Offset V"),
	offsetw: z.number().optional().describe("Offset W"),
	angle: z.number().optional().describe("Angle"),
	fixseams: z.boolean().optional().describe("Fix Seams"),
	xord: z.string().optional().describe("Transform Order"),
	rord: z.string().optional().describe("Rotate Order"),
	tx: z.number().optional().describe("Translate X"),
	ty: z.number().optional().describe("Translate Y"),
	tz: z.number().optional().describe("Translate Z"),
	rx: z.number().optional().describe("Rotate X"),
	ry: z.number().optional().describe("Rotate Y"),
	rz: z.number().optional().describe("Rotate Z"),
	scaletwox: z.number().optional().describe("Scale Two X"),
	scaletwoy: z.number().optional().describe("Scale Two Y"),
	scaletwoz: z.number().optional().describe("Scale Two Z"),
	px: z.number().optional().describe("Pivot X"),
	py: z.number().optional().describe("Pivot Y"),
	pz: z.number().optional().describe("Pivot Z"),
});

export { texture };
