import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const dmxin = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	interface: z.string().optional().describe("Interface"),
	kinetversion: z.string().optional().describe("Kinet Version"),
	device: z.string().optional().describe("Device"),
	serialport: z.string().optional().describe("Serial Port"),
	format: z.string().optional().describe("Format"),
	net: z.number().optional().describe("Net"),
	subnet: z.number().optional().describe("Subnet"),
	universe: z.number().optional().describe("Universe"),
	kinetport: z.number().optional().describe("Kinet Port"),
	filterdat: z.string().optional().describe("Filter DAT"),
	netname: z.string().optional().describe("Net Name"),
	subnetname: z.string().optional().describe("Subnet Name"),
	universename: z.string().optional().describe("Universe Name"),
	kinetportname: z.string().optional().describe("Kinet Port Name"),
	startcodes: z.string().optional().describe("Start Codes"),
	multicast: z.boolean().optional().describe("Multicast"),
	localaddress: z.string().optional().describe("Local Address"),
	discardbcast: z.boolean().optional().describe("Discard Broadcast"),
	queuesize: z.number().optional().describe("Queue Size"),
	rate: z.number().optional().describe("Rate"),
	keepvals: z.boolean().optional().describe("Keep Values"),
	clear: z.boolean().optional().describe("Clear"),
});
