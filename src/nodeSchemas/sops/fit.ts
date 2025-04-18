import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const fit = createSOPSchema({
	group: z.string().optional().describe("Group"),
	method: z.string().optional().describe("Method"),
	type: z.string().optional().describe("Type"),
	surftype: z.string().optional().describe("Surface Type"),
	orderu: z.number().optional().describe("Order U"),
	orderv: z.number().optional().describe("Order V"),
	tol: z.number().optional().describe("Tolerance"),
	smooth: z.number().optional().describe("Smooth"),
	multipleu: z.boolean().optional().describe("Multiple U"),
	multiplev: z.boolean().optional().describe("Multiple V"),
	scope: z.string().optional().describe("Scope"),
	dataparmu: z.string().optional().describe("Data Parameter U"),
	dataparmv: z.string().optional().describe("Data Parameter V"),
	closeu: z.string().optional().describe("Close U"),
	closev: z.string().optional().describe("Close V"),
	corners: z.boolean().optional().describe("Corners"),
});

export { fit };
