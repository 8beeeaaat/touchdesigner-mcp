import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const touchout = createTOPSchema({
	pageindex: z.number().optional(),
	port: z.number().optional(),
	active: z.boolean().optional(),
	fps: z.number().optional(),
	videocodec: z.string().optional(),
	alwayscook: z.boolean().optional(),
});

export { touchout };
