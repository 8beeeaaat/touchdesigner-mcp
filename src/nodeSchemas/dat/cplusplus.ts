import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const cplusplus = createDATSchema({
	plugin: z.string().optional().describe("Plugin"),
	reinit: z.boolean().optional().describe("Reinit"),
	reinitpulse: z.boolean().optional().describe("Reinit Pulse"),
	unloadplugin: z.boolean().optional().describe("Unload Plugin"),
});
