import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const polystitch = createSOPSchema({
	stitch: z.string().optional().describe("Stitch"),
	corners: z.string().optional().describe("Corners"),
	tol3d: z.number().optional().describe("3D Tolerance"),
	consolidate: z.boolean().optional().describe("Consolidate"),
	findcorner: z.boolean().optional().describe("Find Corner"),
	angle: z.number().optional().describe("Angle"),
});

export { polystitch };
