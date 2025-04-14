import { z } from "zod";
import { createTOPSchema } from "./index.js";

const chromakey = createTOPSchema({
	pageindex: z.number().optional(),
	huemin: z.number().optional(),
	huemax: z.number().optional(),
	hsoftlow: z.number().optional(),
	hsofthigh: z.number().optional(),
	satmin: z.number().optional(),
	satmax: z.number().optional(),
	ssoftlow: z.number().optional(),
	ssofthigh: z.number().optional(),
	valmin: z.number().optional(),
	valmax: z.number().optional(),
	vsoftlow: z.number().optional(),
	vsofthigh: z.number().optional(),
	invert: z.number().optional(),
	rgbout: z.string().optional(),
	alphaout: z.string().optional(),
});

export { chromakey };
