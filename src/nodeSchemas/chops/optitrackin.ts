import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const optitrackin = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	connectiontype: z.string().optional().describe("Connection Type"),
	netaddress: z.string().optional().describe("Network Address"),
	localaddress: z.string().optional().describe("Local Address"),
	commandport: z.number().optional().describe("Command Port"),
	dataport: z.number().optional().describe("Data Port"),
	rate: z.number().optional().describe("Rate"),
	resetpulse: z.boolean().optional().describe("Reset Pulse"),
	rigidbodies: z.boolean().optional().describe("Rigid Bodies"),
	labeledmarkers: z.boolean().optional().describe("Labeled Markers"),
	unlabeledmarkers: z.boolean().optional().describe("Unlabeled Markers"),
});
