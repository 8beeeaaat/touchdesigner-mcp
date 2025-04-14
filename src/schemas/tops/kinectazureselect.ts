import { z } from "zod";
import { createTOPSchema } from "./index.js";

const kinectazureselect = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	top: z.any().optional(),
	image: z.string().optional(),
	remapimage: z.boolean().optional(),
	bodyimage: z.boolean().optional(),
	mirrorimage: z.boolean().optional(),
});

export { kinectazureselect };
