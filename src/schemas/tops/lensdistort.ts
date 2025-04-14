import { z } from "zod";
import { createTOPSchema } from "./index.js";

const lensdistort = createTOPSchema({
	pageindex: z.number().optional(),
	invert: z.boolean().optional(),
	lensr: z.number().optional(),
	centerx: z.number().optional(),
	centery: z.number().optional(),
	color: z.boolean().optional(),
	blur: z.number().optional(),
	crop: z.boolean().optional(),
});

export { lensdistort };
