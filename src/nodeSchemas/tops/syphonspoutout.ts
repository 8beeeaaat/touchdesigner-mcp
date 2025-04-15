import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const syphonspoutout = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	renamepulse: z.boolean().optional(),
	protocol: z.string().optional(),
	servername: z.string().optional(),
	appname: z.string().optional(),
	customappname: z.string().optional(),
	description: z.string().optional(),
	findconsumers: z.boolean().optional(),
	texturename: z.string().optional(),
	texture: z.boolean().optional(),
	gl: z.boolean().optional(),
});

export { syphonspoutout };
