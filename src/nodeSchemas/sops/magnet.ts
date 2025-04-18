import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const magnet = createSOPSchema({
	deformgrp: z.string().optional().describe("Deform Group"),
	magnetgrp: z.string().optional().describe("Magnet Group"),
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
	position: z.boolean().optional().describe("Position"),
	color: z.boolean().optional().describe("Color"),
	nml: z.boolean().optional().describe("Normal"),
	velocity: z.boolean().optional().describe("Velocity"),
});

export { magnet };
