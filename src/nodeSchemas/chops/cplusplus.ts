import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const cplusplus = createCHOPSchema({
	plugin: z.string().optional().describe("Plugin Path"),
	reinit: z.boolean().optional().describe("Reinitialize"),
	reinitpulse: z.boolean().optional().describe("Reinitialize Pulse"),
	unloadplugin: z.boolean().optional().describe("Unload Plugin"),
});
