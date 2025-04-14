import { z } from "zod";
import { createTOPSchema } from "./index.js";

const displace = createTOPSchema({
	pageindex: z.number().optional(),
	horzsource: z.string().optional(),
	vertsource: z.string().optional(),
	midpointx: z.number().optional(),
	midpointy: z.number().optional(),
	displaceweightx: z.number().optional(),
	displaceweighty: z.number().optional(),
	uvweight: z.number().optional(),
	offsetx: z.number().optional(),
	offsety: z.number().optional(),
	offsetweight: z.number().optional(),
	extend: z.string().optional(),
	ressource: z.string().optional(),
});

export { displace };
