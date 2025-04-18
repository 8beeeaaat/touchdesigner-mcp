import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const ray = createSOPSchema({
	group: z.string().optional().describe("Group"),
	method: z.string().optional().describe("Method"),
	dotrans: z.boolean().optional().describe("Do Transform"),
	lookfar: z.boolean().optional().describe("Look Far"),
	normal: z.string().optional().describe("Normal"),
	bounces: z.number().optional().describe("Bounces"),
	bouncegeo: z.boolean().optional().describe("Bounce Geometry"),
	putdist: z.boolean().optional().describe("Put Distance"),
	scale: z.number().optional().describe("Scale"),
	lift: z.number().optional().describe("Lift"),
	sample: z.number().optional().describe("Sample"),
	jitter: z.number().optional().describe("Jitter"),
	seed: z.number().optional().describe("Seed"),
	newgrp: z.boolean().optional().describe("New Group"),
	hitgrp: z.string().optional().describe("Hit Group"),
});

export { ray };
