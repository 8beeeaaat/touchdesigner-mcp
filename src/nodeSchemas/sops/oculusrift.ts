import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const oculusrift = createSOPSchema({
	model: z.string().optional().describe("Model"),
});

export { oculusrift };
