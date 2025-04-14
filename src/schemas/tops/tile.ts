import { z } from "zod";
import { createTOPSchema } from "./index.js";

const tile = createTOPSchema({
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
	flop: z.boolean().optional(),
	repeatx: z.number().optional(),
	repeaty: z.number().optional(),
	flipx: z.boolean().optional(),
	flipy: z.boolean().optional(),
	reflectx: z.boolean().optional(),
	reflecty: z.boolean().optional(),
	overlapu: z.number().optional(),
	overlapuunit: z.string().optional(),
	overlapv: z.number().optional(),
	overlapvunit: z.string().optional(),
});

export { tile };
