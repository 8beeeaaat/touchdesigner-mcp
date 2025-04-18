import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for clip CHOP node parameters
 */
export const clip = createCHOPSchema({
	rdat: z.any().optional().describe("Reference DAT"),
	callbacks: z.any().optional().describe("Callbacks"),
	reload: z.boolean().optional().describe("Reload"),
	rord: z.string().optional().describe("Rotation Order"),
	transtion: z.string().optional().describe("Transition"),
	blendtime: z.number().optional().describe("Blend Time"),
	blendtimeunit: z.string().optional().describe("Blend Time Unit"),
	next: z.string().optional().describe("Next"),
	nblendtime: z.number().optional().describe("Next Blend Time"),
	nblendtimeunit: z.string().optional().describe("Next Blend Time Unit"),
	loopactive: z.boolean().optional().describe("Loop Active"),
	looprelease: z.string().optional().describe("Loop Release"),
	indexchannel: z.string().optional().describe("Index Channel"),
	abspos: z.string().optional().describe("Absolute Position"),
	rottype: z.string().optional().describe("Rotation Type"),
	pauseend: z.boolean().optional().describe("Pause End"),
});
