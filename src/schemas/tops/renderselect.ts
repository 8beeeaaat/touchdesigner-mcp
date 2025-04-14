import { z } from "zod";
import { createTOPSchema } from "./index.js";

const renderselect = createTOPSchema({
	pageindex: z.number().optional(),
	top: z.any().optional(),
	mode: z.string().optional(),
	imageoutputname: z.string().optional(),
	index: z.number().optional(),
	cameraindex: z.number().optional(),
	peellayerindex: z.number().optional(),
});

export { renderselect };
