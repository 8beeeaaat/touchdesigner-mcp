import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const deform = createSOPSchema({
	group: z.string().optional().describe("Group"),
	delcaptatr: z.boolean().optional().describe("Delete Capture Attribute"),
	delcolatr: z.boolean().optional().describe("Delete Color Attribute"),
	donormal: z.boolean().optional().describe("Compute Normals"),
	skelrootpath: z
		.union([z.string(), z.null()])
		.optional()
		.describe("Skeleton Root Path"),
});

export { deform };
