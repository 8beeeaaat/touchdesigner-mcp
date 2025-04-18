import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const limit = createSOPSchema({
	chop: z.string().nullable().optional().describe("CHOP"),
	rord: z.string().optional().describe("Rotation Order"),
	chanx: z.string().optional().describe("Channel X"),
	chany: z.string().optional().describe("Channel Y"),
	chanz: z.string().optional().describe("Channel Z"),
	chanrx: z.string().optional().describe("Channel Rotate X"),
	chanry: z.string().optional().describe("Channel Rotate Y"),
	chanrz: z.string().optional().describe("Channel Rotate Z"),
	chanrad: z.string().optional().describe("Channel Radius"),
	chanradx: z.string().optional().describe("Channel Radius X"),
	chanrady: z.string().optional().describe("Channel Radius Y"),
	chanradz: z.string().optional().describe("Channel Radius Z"),
	chanalpha: z.string().optional().describe("Channel Alpha"),
	chanr: z.string().optional().describe("Channel R"),
	chang: z.string().optional().describe("Channel G"),
	chanb: z.string().optional().describe("Channel B"),
	texturew: z.string().optional().describe("Texture Width"),
	customattr: z.number().optional().describe("Custom Attribute"),
	customattr0name: z.string().optional().describe("Custom Attribute 0 Name"),
	customattr0chan0: z
		.string()
		.optional()
		.describe("Custom Attribute 0 Channel 0"),
	customattr0chan1: z
		.string()
		.optional()
		.describe("Custom Attribute 0 Channel 1"),
	customattr0chan2: z
		.string()
		.optional()
		.describe("Custom Attribute 0 Channel 2"),
	customattr0chan3: z
		.string()
		.optional()
		.describe("Custom Attribute 0 Channel 3"),
	output: z.string().optional().describe("Output"),
	divisions: z.number().optional().describe("Divisions"),
	rad: z.number().optional().describe("Radius"),
	flipsmooth: z.number().optional().describe("Flip Smooth"),
	dolimit: z.string().optional().describe("Do Limit"),
	xlimitmin: z.number().optional().describe("X Limit Min"),
	xlimitmax: z.number().optional().describe("X Limit Max"),
	ylimitmin: z.number().optional().describe("Y Limit Min"),
	ylimitmax: z.number().optional().describe("Y Limit Max"),
	zlimitmin: z.number().optional().describe("Z Limit Min"),
	zlimitmax: z.number().optional().describe("Z Limit Max"),
	texture: z.boolean().optional().describe("Texture"),
	texscale1: z.number().optional().describe("Texture Scale 1"),
	texscale2: z.number().optional().describe("Texture Scale 2"),
	texoffset1: z.number().optional().describe("Texture Offset 1"),
	texoffset2: z.number().optional().describe("Texture Offset 2"),
	orient: z.boolean().optional().describe("Orient"),
	lookat: z.string().nullable().optional().describe("Look At"),
	dorotate: z.string().optional().describe("Do Rotate"),
	rotatex: z.number().optional().describe("Rotate X"),
	rotatey: z.number().optional().describe("Rotate Y"),
	rotatez: z.number().optional().describe("Rotate Z"),
	normals: z.boolean().optional().describe("Normals"),
});

export { limit };
