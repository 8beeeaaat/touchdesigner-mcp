import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const inversekin = createCHOPSchema({
	solvertype: z.string().optional().describe("Solver Type"),
	boneroot: z.any().nullable().optional().describe("Bone Root"),
	boneend: z.any().nullable().optional().describe("Bone End"),
	endaffector: z.any().nullable().optional().describe("End Affector"),
	twistaffector: z.any().nullable().optional().describe("Twist Affector"),
	iktwist: z.number().optional().describe("IK Twist"),
	ikdampen: z.number().optional().describe("IK Dampen"),
	curve: z.any().nullable().optional().describe("Curve"),
});
