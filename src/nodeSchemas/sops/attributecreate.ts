import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const attributecreate = createSOPSchema({
	compnml: z.boolean().optional().describe("Compute Normals"),
	comptang: z.boolean().optional().describe("Compute Tangents"),
	mikktspace: z.boolean().optional().describe("Use Mikktspace"),
});

export { attributecreate };
