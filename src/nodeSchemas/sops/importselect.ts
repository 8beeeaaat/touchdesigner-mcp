import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const importselect = createSOPSchema({
	parent: z.union([z.string(), z.null()]).optional().describe("Parent"),
	geometry: z.string().optional().describe("Geometry"),
	reload: z.boolean().optional().describe("Reload"),
	comptang: z.boolean().optional().describe("Compute Tangent"),
	useparentanim: z.boolean().optional().describe("Use Parent Animation"),
	shiftanimationstart: z.boolean().optional().describe("Shift Animation Start"),
	sampleratemode: z.string().optional().describe("Sample Rate Mode"),
	samplerate: z.number().optional().describe("Sample Rate"),
	playmode: z.string().optional().describe("Play Mode"),
	initialize: z.boolean().optional().describe("Initialize"),
	start: z.boolean().optional().describe("Start"),
	cue: z.boolean().optional().describe("Cue"),
	cuepulse: z.boolean().optional().describe("Cue Pulse"),
	cuepoint: z.number().optional().describe("Cue Point"),
	cuepointunit: z.string().optional().describe("Cue Point Unit"),
	play: z.boolean().optional().describe("Play"),
	index: z.number().optional().describe("Index"),
	indexunit: z.string().optional().describe("Index Unit"),
	speed: z.number().optional().describe("Speed"),
	trim: z.boolean().optional().describe("Trim"),
	tstart: z.number().optional().describe("Trim Start"),
	tstartunit: z.string().optional().describe("Trim Start Unit"),
	tend: z.number().optional().describe("Trim End"),
	tendunit: z.string().optional().describe("Trim End Unit"),
	textendleft: z.string().optional().describe("Time Extend Left"),
	textendright: z.string().optional().describe("Time Extend Right"),
});

export { importselect };
