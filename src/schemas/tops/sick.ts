import { z } from "zod";
import { createTOPSchema } from "./index.js";

const sick = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	reinitialize: z.boolean().optional(),
	launchfile: z.string().optional(),
	deviceaddress: z.string().optional(),
	port: z.string().optional(),
	customargs: z.string().optional(),
	red: z.string().optional(),
	green: z.string().optional(),
	blue: z.string().optional(),
	alpha: z.string().optional(),
});

export { sick };
