import { z } from "zod";
import { createTOPSchema } from "./index.js";

const composite = createTOPSchema({
	pageindex: z.number().optional(),
	tops: z.any().optional(),
	previewgrid: z.boolean().optional(),
	selectinput: z.boolean().optional(),
	inputindex: z.number().optional(),
	operand: z.string().optional(),
	swaporder: z.boolean().optional(),
	size: z.string().optional(),
	prefit: z.string().optional(),
	justifyh: z.string().optional(),
	justifyv: z.string().optional(),
	extend: z.string().optional(),
	r: z.number().optional(),
	tx: z.number().optional(),
	ty: z.number().optional(),
	tunit: z.string().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	px: z.number().optional(),
	py: z.number().optional(),
	punit: z.string().optional(),
	tstepx: z.number().optional(),
	tstepy: z.number().optional(),
	tstepunit: z.string().optional(),
	legacyxform: z.boolean().optional(),
});

export { composite };
