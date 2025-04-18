import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const refine = createSOPSchema({
	group: z.string().optional().describe("Group"),
	firstu: z.boolean().optional().describe("First U"),
	domainu1: z.number().optional().describe("Domain U1"),
	secondu: z.boolean().optional().describe("Second U"),
	domainu2: z.number().optional().describe("Domain U2"),
	divsu: z.number().optional().describe("Divisions U"),
	firstv: z.boolean().optional().describe("First V"),
	domainv1: z.number().optional().describe("Domain V1"),
	secondv: z.boolean().optional().describe("Second V"),
	domainv2: z.number().optional().describe("Domain V2"),
	divsv: z.number().optional().describe("Divisions V"),
	method: z.string().optional().describe("Method"),
	nurbu: z.number().optional().describe("NURB U"),
	nurbv: z.number().optional().describe("NURB V"),
	space: z.string().optional().describe("Space"),
	tolu: z.number().optional().describe("Tolerance U"),
	tolv: z.number().optional().describe("Tolerance V"),
});

export { refine };
