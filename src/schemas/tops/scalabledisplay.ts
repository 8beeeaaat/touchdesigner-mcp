import { z } from "zod";
import { createTOPSchema } from "./index.js";

const scalabledisplay = createTOPSchema({
	pageindex: z.number().optional(),
	configfile: z.string().optional(),
	near: z.number().optional(),
	far: z.number().optional(),
	eyepoint1: z.number().optional(),
	eyepoint2: z.number().optional(),
	eyepoint3: z.number().optional(),
});

export { scalabledisplay };
