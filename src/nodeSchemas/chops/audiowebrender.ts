import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

/**
 * Schema for audiowebrender CHOP node parameters
 */
export const audiowebrender = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	webrender: z.any().optional().describe("Web Render"),
});
