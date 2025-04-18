import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const box = createSOPSchema({
	orientbounds: z.boolean().optional().describe("Orient Bounds"),
	sizex: z.number().optional().describe("Size X"),
	sizey: z.number().optional().describe("Size Y"),
	sizez: z.number().optional().describe("Size Z"),
	s: z.number().optional().describe("Scale"),
	dodivs: z.boolean().optional().describe("Do Divisions"),
	divsx: z.number().optional().describe("Divisions X"),
	divsy: z.number().optional().describe("Divisions Y"),
	divsz: z.number().optional().describe("Divisions Z"),
	rebar: z.boolean().optional().describe("Rebar"),
	consolidatepts: z.boolean().optional().describe("Consolidate Points"),
});

export { box };
