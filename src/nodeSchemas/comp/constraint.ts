import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for constraint COMP node parameters
 */
export const constraint = createCOMPSchema({
	active: z.boolean().optional(),
	type: z.string().optional(),
	bodytobody: z.boolean().optional(),
	collisions: z.boolean().optional(),
	dispcon: z.boolean().optional(),

	actor1: z.union([z.string(), z.null()]).optional(),
	bodies1: z.string().optional(),
	pivot1x: z.number().optional(),
	pivot1y: z.number().optional(),
	pivot1z: z.number().optional(),
	axis1x: z.number().optional(),
	axis1y: z.number().optional(),
	axis1z: z.number().optional(),
	sliderrot1x: z.number().optional(),
	sliderrot1y: z.number().optional(),
	sliderrot1z: z.number().optional(),

	actor2: z.union([z.string(), z.null()]).optional(),
	bodies2: z.string().optional(),
	pivot2x: z.number().optional(),
	pivot2y: z.number().optional(),
	pivot2z: z.number().optional(),
	axis2x: z.number().optional(),
	axis2y: z.number().optional(),
	axis2z: z.number().optional(),
	sliderrot2x: z.number().optional(),
	sliderrot2y: z.number().optional(),
	sliderrot2z: z.number().optional(),

	enablelimits: z.boolean().optional(),
	lowerlinlim: z.number().optional(),
	upperlinlim: z.number().optional(),
	loweranglim: z.number().optional(),
	upperanglim: z.number().optional(),
});
