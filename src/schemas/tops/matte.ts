import { z } from "zod";
import { createTOPSchema } from "./index.js";

const matte = createTOPSchema({
	pageindex: z.number().optional(),
	switchinputs: z.number().optional(),
	mattechannel: z.string().optional(),
});

export { matte };
