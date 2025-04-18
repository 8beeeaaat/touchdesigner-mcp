import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const joystick = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	source: z.string().optional().describe("Source"),
	axisrange: z.string().optional().describe("Axis Range"),
	xaxis: z.string().optional().describe("X Axis"),
	yaxis: z.string().optional().describe("Y Axis"),
	yaxisinvert: z.boolean().optional().describe("Y Axis Invert"),
	zaxis: z.string().optional().describe("Z Axis"),
	xrot: z.string().optional().describe("X Rotation"),
	yrot: z.string().optional().describe("Y Rotation"),
	yrotinvert: z.boolean().optional().describe("Y Rotation Invert"),
	zrot: z.string().optional().describe("Z Rotation"),
	slider0: z.string().optional().describe("Slider 0"),
	slider1: z.string().optional().describe("Slider 1"),
	buttonarray: z.string().optional().describe("Button Array"),
	povarrray: z.string().optional().describe("POV Array"),
	povstatearray: z.string().optional().describe("POV State Array"),
	connected: z.string().optional().describe("Connected"),
	axisdeadzone: z.number().optional().describe("Axis Deadzone"),
	rate: z.number().optional().describe("Rate"),
	left: z.string().optional().describe("Left Boundary"),
	right: z.string().optional().describe("Right Boundary"),
	defval: z.number().optional().describe("Default Value"),
});
