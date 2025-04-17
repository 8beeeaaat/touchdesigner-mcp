import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const oculusaudio = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	headobject: z.any().nullable().optional().describe("Head Object"),
	sourceobject: z.any().nullable().optional().describe("Source Object"),
	minrange: z.number().optional().describe("Min Range"),
	maxrange: z.number().optional().describe("Max Range"),
	diameter: z.number().optional().describe("Diameter"),
	bandhint: z.string().optional().describe("Band Hint"),
	reflectrevert: z.boolean().optional().describe("Reflect Revert"),
	attenuation: z.string().optional().describe("Attenuation"),
	attenuationscale: z.number().optional().describe("Attenuation Scale"),
	boxroommode: z.boolean().optional().describe("Box Room Mode"),
	roomsizex: z.number().optional().describe("Room Size X"),
	roomsizey: z.number().optional().describe("Room Size Y"),
	roomsizez: z.number().optional().describe("Room Size Z"),
	roomleftrelfect: z.number().optional().describe("Room Left Reflect"),
	roomrightrelfect: z.number().optional().describe("Room Right Reflect"),
	roombottomrelfect: z.number().optional().describe("Room Bottom Reflect"),
	roomtoprelfect: z.number().optional().describe("Room Top Reflect"),
	roomfrontrelfect: z.number().optional().describe("Room Front Reflect"),
	roombackrelfect: z.number().optional().describe("Room Back Reflect"),
});
