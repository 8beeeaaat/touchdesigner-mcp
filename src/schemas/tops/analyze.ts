import { z } from "zod";
import { createTOPSchema } from "./index.js";

const analyze = createTOPSchema({
	pageindex: z.number().optional(),
	type: z.string().optional(),
	preop: z.any().optional(),
	rangelow: z.number().optional(),
	rangehigh: z.number().optional(),
	rangepoint: z.number().optional(),
	channelmode: z.string().optional(),
	overlaycolor: z.boolean().optional(),
	datachop: z.any().optional(),
	inputop: z.any().optional(),
});

export { analyze };
