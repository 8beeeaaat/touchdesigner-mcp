import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const midiinmap = createCHOPSchema({
	device: z.string().optional().describe("Device"),
	id: z.string().optional().describe("ID"),
	sliders: z.string().optional().describe("Sliders"),
	buttons: z.string().optional().describe("Buttons"),
	bvelocity: z.boolean().optional().describe("Button Velocity"),
	squeue: z.boolean().optional().describe("Slider Queue"),
	rate: z.number().optional().describe("Rate"),
	left: z.string().optional().describe("Left Boundary"),
	right: z.string().optional().describe("Right Boundary"),
	defval: z.number().optional().describe("Default Value"),
});
