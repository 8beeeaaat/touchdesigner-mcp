import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const mousein = createCHOPSchema({
	active: z.string().optional().describe("Active"),
	output: z.string().optional().describe("Output"),
	posxname: z.string().optional().describe("Position X Name"),
	posyname: z.string().optional().describe("Position Y Name"),
	lbuttonname: z.string().optional().describe("Left Button Name"),
	rbuttonname: z.string().optional().describe("Right Button Name"),
	mbuttonname: z.string().optional().describe("Middle Button Name"),
	wheel: z.string().optional().describe("Wheel"),
	wheelinc: z.number().optional().describe("Wheel Increment"),
	monitor: z.string().optional().describe("Monitor"),
	panels: z.any().nullable().optional().describe("Panels"),
	rate: z.number().optional().describe("Rate"),
	left: z.string().optional().describe("Left Boundary"),
	right: z.string().optional().describe("Right Boundary"),
	defval: z.number().optional().describe("Default Value"),
});
