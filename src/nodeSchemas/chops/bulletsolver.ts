import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for bulletsolver CHOP node parameters
 */
export const bulletsolver = createCHOPSchema({
	comp: z.any().optional().describe("COMP"),
	xformspace: z.string().optional().describe("Transform Space"),
	collisioninfo: z.boolean().optional().describe("Collision Info"),
	trans: z.boolean().optional().describe("Translation"),
	rot: z.boolean().optional().describe("Rotation"),
	scale: z.boolean().optional().describe("Scale"),
	linvel: z.boolean().optional().describe("Linear Velocity"),
	angvel: z.boolean().optional().describe("Angular Velocity"),
	rate: z.number().optional().describe("Rate"),
});
