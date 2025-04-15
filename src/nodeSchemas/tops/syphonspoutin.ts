import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const syphonspoutin = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	renamepulse: z.boolean().optional(),
	protocol: z.string().optional(),
	servername: z.string().optional(),
	appname: z.string().optional(),
	customappname: z.string().optional(),
	serverdescription: z.string().optional(),
	findservers: z.boolean().optional(),
	texturename: z.string().optional(),
	fps: z.number().optional(),
	activefps: z.boolean().optional(),
	reportfps: z.boolean().optional(),
	resetreportedstats: z.boolean().optional(),
	gl: z.boolean().optional(),
	customresolution: z.boolean().optional(),
	resolutionw: z.number().optional(),
	resolutionh: z.number().optional(),
});

export { syphonspoutin };
