import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const raster = createSOPSchema({
	top: z.any().nullable().optional().describe("TOP"),
	direction: z.string().optional().describe("Direction"),
	downloadtype: z.string().optional().describe("Download Type"),
});

export { raster };
