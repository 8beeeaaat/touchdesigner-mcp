import { z } from "zod";
import { createCOMPSchema } from "./utils.js";

/**
 * Schema for bone COMP node parameters
 */
export const bone = createCOMPSchema({
	displaylink: z.boolean().optional(),
	restanglesx: z.number().optional(),
	restanglesy: z.number().optional(),
	restanglesz: z.number().optional(),
	length: z.number().optional(),

	ikdamp: z.number().optional(),
	beginxrange: z.number().optional(),
	endxrange: z.number().optional(),
	xdamp: z.number().optional(),
	xrolloff: z.number().optional(),
	beginyrange: z.number().optional(),
	endyrange: z.number().optional(),
	ydamp: z.number().optional(),
	yrolloff: z.number().optional(),

	displaycapture: z.boolean().optional(),
	crcenterx: z.number().optional(),
	crcentery: z.number().optional(),
	crcenterz: z.number().optional(),
	crtopheight: z.number().optional(),
	crtopcapx: z.number().optional(),
	crtopcapy: z.number().optional(),
	crtopcapz: z.number().optional(),
	crbotheight: z.number().optional(),
	crbotcapx: z.number().optional(),
	crbotcapy: z.number().optional(),
	crbotcapz: z.number().optional(),

	tx: z.number().optional(),
	ty: z.number().optional(),
	tz: z.number().optional(),
	rx: z.number().optional(),
	ry: z.number().optional(),
	rz: z.number().optional(),
	sx: z.number().optional(),
	sy: z.number().optional(),
	sz: z.number().optional(),

	render: z.boolean().optional(),
	material: z.union([z.string(), z.null()]).optional(),
});
