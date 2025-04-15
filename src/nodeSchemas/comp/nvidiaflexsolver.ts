import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for nvidiaflexsolver COMP node parameters
 */
export const nvidiaflexsolver = createCOMPSchema({
	initialize: z.boolean().optional(),
	active: z.boolean().optional(),
	gravity: z.number().optional(),

	numparticles: z.number().optional(),
	radius: z.number().optional(),
	damping: z.number().optional(),
	friction: z.number().optional(),
	restitution: z.number().optional(),

	substeps: z.number().optional(),
	iterations: z.number().optional(),
	maxspeed: z.number().optional(),

	fluidrestdistance: z.number().optional(),
	fluidsurfacetension: z.number().optional(),
	fluidviscosity: z.number().optional(),
});
