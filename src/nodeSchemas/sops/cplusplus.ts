import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const cplusplus = createSOPSchema({
	plugin: z.string().optional().describe("Plugin"),
	reinit: z.boolean().optional().describe("Reinitialize"),
	reinitpulse: z.boolean().optional().describe("Reinitialize Pulse"),
	unloadplugin: z.boolean().optional().describe("Unload Plugin"),
});

export { cplusplus };
