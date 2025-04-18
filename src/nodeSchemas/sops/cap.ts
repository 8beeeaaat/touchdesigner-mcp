import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const cap = createSOPSchema({
	group: z.string().optional().describe("Group"),
	firstu: z.string().optional().describe("First U"),
	divsu1: z.number().optional().describe("Divisions U1"),
	scaleu1: z.number().optional().describe("Scale U1"),
	lastu: z.string().optional().describe("Last U"),
	divsu2: z.number().optional().describe("Divisions U2"),
	scaleu2: z.number().optional().describe("Scale U2"),
	pshapeu: z.boolean().optional().describe("P Shape U"),
	firstv: z.string().optional().describe("First V"),
	divsv1: z.number().optional().describe("Divisions V1"),
	scalev1: z.number().optional().describe("Scale V1"),
	lastv: z.string().optional().describe("Last V"),
	divsv2: z.number().optional().describe("Divisions V2"),
	scalev2: z.number().optional().describe("Scale V2"),
	pshapev: z.boolean().optional().describe("P Shape V"),
});

export { cap };
