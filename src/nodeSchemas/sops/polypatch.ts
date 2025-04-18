import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const polypatch = createSOPSchema({
	group: z.string().optional().describe("Group"),
	basis: z.string().optional().describe("Basis"),
	connecttype: z.string().optional().describe("Connect Type"),
	closeu: z.string().optional().describe("Close U"),
	closev: z.string().optional().describe("Close V"),
	firstuclamp: z.string().optional().describe("First U Clamp"),
	lastuclamp: z.string().optional().describe("Last U Clamp"),
	firstvclamp: z.string().optional().describe("First V Clamp"),
	lastvclamp: z.string().optional().describe("Last V Clamp"),
	divisionsx: z.number().optional().describe("Divisions X"),
	divisionsy: z.number().optional().describe("Divisions Y"),
	polys: z.boolean().optional().describe("Polygons"),
});

export { polypatch };
