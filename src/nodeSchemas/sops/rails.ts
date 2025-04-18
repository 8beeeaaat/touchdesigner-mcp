import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const rails = createSOPSchema({
	xsectgrp: z.string().optional().describe("Cross Section Group"),
	railgrp: z.string().optional().describe("Rail Group"),
	cycle: z.string().optional().describe("Cycle"),
	pairs: z.boolean().optional().describe("Pairs"),
	firstl: z.boolean().optional().describe("First L"),
	stretch: z.boolean().optional().describe("Stretch"),
	usevtx: z.boolean().optional().describe("Use Vertex"),
	vertex1: z.number().optional().describe("Vertex 1"),
	vertex2: z.number().optional().describe("Vertex 2"),
	scale: z.number().optional().describe("Scale"),
	roll: z.number().optional().describe("Roll"),
	noflip: z.boolean().optional().describe("No Flip"),
	usedir: z.boolean().optional().describe("Use Direction"),
	dirx: z.number().optional().describe("Direction X"),
	diry: z.number().optional().describe("Direction Y"),
	dirz: z.number().optional().describe("Direction Z"),
	newg: z.boolean().optional().describe("New Group"),
	railname: z.string().optional().describe("Rail Name"),
});

export { rails };
