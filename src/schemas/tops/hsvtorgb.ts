import { z } from "zod";
import { createTOPSchema } from "./index.js";

const hsvtorgb = createTOPSchema({
	pageindex: z.number().optional(),
});

export { hsvtorgb };
