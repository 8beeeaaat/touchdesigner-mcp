import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const bonegroup = createSOPSchema({
	bonesperpoint: z.number().optional().describe("Bones Per Point"),
	bonespergroup: z.number().optional().describe("Bones Per Group"),
});

export { bonegroup };
