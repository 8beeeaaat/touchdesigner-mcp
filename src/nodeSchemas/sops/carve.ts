import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const carve = createSOPSchema({
	group: z.string().optional().describe("Group"),
	firstu: z.boolean().optional().describe("First U"),
	domainu1: z.number().optional().describe("Domain U1"),
	secondu: z.boolean().optional().describe("Second U"),
	domainu2: z.number().optional().describe("Domain U2"),
	firstv: z.boolean().optional().describe("First V"),
	domainv1: z.number().optional().describe("Domain V1"),
	secondv: z.boolean().optional().describe("Second V"),
	domainv2: z.number().optional().describe("Domain V2"),
	method: z.string().optional().describe("Method"),
	keepin: z.boolean().optional().describe("Keep In"),
	keepout: z.boolean().optional().describe("Keep Out"),
	extractop: z.string().optional().describe("Extract Operation"),
	keeporiginal: z.boolean().optional().describe("Keep Original"),
	location: z.string().optional().describe("Location"),
	divsu: z.number().optional().describe("Divisions U"),
	divsv: z.number().optional().describe("Divisions V"),
	allubreakpoints: z.boolean().optional().describe("All U Breakpoints"),
	allvbreakpoints: z.boolean().optional().describe("All V Breakpoints"),
});

export { carve };
