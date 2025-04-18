import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const ltcout = createCHOPSchema({
	playmode: z.string().optional().describe("Play Mode"),
	play: z.boolean().optional().describe("Play"),
	cue: z.boolean().optional().describe("Cue"),
	cuepulse: z.boolean().optional().describe("Cue Pulse"),
	frame: z.number().optional().describe("Frame"),
	second: z.number().optional().describe("Second"),
	minute: z.number().optional().describe("Minute"),
	hour: z.number().optional().describe("Hour"),
	framerate: z.number().optional().describe("Frame Rate"),
	dropframe: z.boolean().optional().describe("Drop Frame"),
	highfpsbehavior: z.string().optional().describe("High FPS Behavior"),
	timecodeop: z.any().nullable().optional().describe("Timecode OP"),
	audiorate: z.number().optional().describe("Audio Rate"),
	user1: z.number().optional().describe("User 1"),
	user2: z.number().optional().describe("User 2"),
	user3: z.number().optional().describe("User 3"),
	user4: z.number().optional().describe("User 4"),
	user5: z.number().optional().describe("User 5"),
	user6: z.number().optional().describe("User 6"),
	user7: z.number().optional().describe("User 7"),
	user8: z.number().optional().describe("User 8"),
});
