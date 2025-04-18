import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const arm = createSOPSchema({
	capttype: z.string().optional().describe("Capture Type"),
	axis: z.string().optional().describe("Axis"),
	bonerad: z.number().optional().describe("Bone Radius"),
	rotatehand: z.boolean().optional().describe("Rotate Hand"),
	autoelbow: z.boolean().optional().describe("Auto Elbow"),
	elbowtwist: z.number().optional().describe("Elbow Twist"),
	flipelbow: z.boolean().optional().describe("Flip Elbow"),
	clavlength: z.number().optional().describe("Clavicle Length"),
	humlength: z.number().optional().describe("Humerus Length"),
	ulnalength: z.number().optional().describe("Ulna Length"),
	handlength: z.number().optional().describe("Hand Length"),
	shoulder: z.number().optional().describe("Shoulder"),
	elbow: z.number().optional().describe("Elbow"),
	wrist: z.number().optional().describe("Wrist"),
	affector: z.union([z.string(), z.null()]).optional().describe("Affector"),
	sx: z.number().optional().describe("Scale X"),
	sy: z.number().optional().describe("Scale Y"),
	sz: z.number().optional().describe("Scale Z"),
});

export { arm };
