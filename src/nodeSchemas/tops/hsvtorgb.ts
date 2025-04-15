import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const hsvtorgb = createTOPSchema({
	pageindex: z.number().optional(),
});

export { hsvtorgb };
