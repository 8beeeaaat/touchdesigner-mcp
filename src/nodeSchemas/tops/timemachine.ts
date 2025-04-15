import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const timemachine = createTOPSchema({
	pageindex: z.number().optional(),
	blackoffset: z.number().optional(),
	blackoffsetunit: z.string().optional(),
	whiteoffset: z.number().optional(),
	whiteoffsetunit: z.string().optional(),
	samplemode: z.string().optional(),
	sampleunits: z.string().optional(),
	wcoord: z.number().optional(),
});

export { timemachine };
