import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const crop = createTOPSchema({
	pageindex: z.number().optional(),
	cropleft: z.number().optional(),
	cropleftunit: z.string().optional(),
	cropright: z.number().optional(),
	croprightunit: z.string().optional(),
	cropbottom: z.number().optional(),
	cropbottomunit: z.string().optional(),
	croptop: z.number().optional(),
	croptopunit: z.string().optional(),
	extend: z.string().optional(),
});

export { crop };
