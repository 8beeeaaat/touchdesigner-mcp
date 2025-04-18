import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const alembic = createSOPSchema({
	file: z.string().optional().describe("File"),
	objectpath: z.string().optional().describe("Object Path"),
	xform: z.string().optional().describe("Transform"),
	time: z.number().optional().describe("Time"),
	timeunit: z.string().optional().describe("Time Unit"),
	fps: z.number().optional().describe("FPS"),
	interp: z.string().optional().describe("Interpolation"),
	directtogpu: z.boolean().optional().describe("Direct to GPU"),
	compnml: z.boolean().optional().describe("Compute Normals"),
	loadfile: z.boolean().optional().describe("Load File"),
});

export { alembic };
