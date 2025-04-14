import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const channelmix = createTOPSchema({
	pageindex: z.number().optional(),
	redtored: z.number().optional(),
	redtogreen: z.number().optional(),
	redtoblue: z.number().optional(),
	redtoalpha: z.number().optional(),
	greentored: z.number().optional(),
	greentogreen: z.number().optional(),
	greentoblue: z.number().optional(),
	greentoalpha: z.number().optional(),
	bluetored: z.number().optional(),
	bluetogreen: z.number().optional(),
	bluetoblue: z.number().optional(),
	bluetoalpha: z.number().optional(),
	alphatored: z.number().optional(),
	alphatogreen: z.number().optional(),
	alphatoblue: z.number().optional(),
	alphatoalpha: z.number().optional(),
});

export { channelmix };
