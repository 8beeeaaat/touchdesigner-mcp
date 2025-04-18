import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const surfsect = createSOPSchema({
	groupa: z.string().optional().describe("Group A"),
	groupb: z.string().optional().describe("Group B"),
	tol3d: z.number().optional().describe("3D Tolerance"),
	tol2d: z.number().optional().describe("2D Tolerance"),
	step: z.number().optional().describe("Step"),
	method: z.string().optional().describe("Method"),
	boolop: z.string().optional().describe("Boolean Operation"),
	insidea: z.boolean().optional().describe("Inside A"),
	insideb: z.boolean().optional().describe("Inside B"),
	outsidea: z.boolean().optional().describe("Outside A"),
	outsideb: z.boolean().optional().describe("Outside B"),
	target: z.string().optional().describe("Target"),
	creategroupa: z.boolean().optional().describe("Create Group A"),
	profilesa: z.string().optional().describe("Profiles A"),
	creategroupb: z.boolean().optional().describe("Create Group B"),
	profilesb: z.string().optional().describe("Profiles B"),
	mindholes: z.boolean().optional().describe("Mind Holes"),
	join: z.boolean().optional().describe("Join"),
});

export { surfsect };
