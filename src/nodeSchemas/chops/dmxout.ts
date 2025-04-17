import { z } from "zod";
import { createCHOPSchema } from "./utils.js";

export const dmxout = createCHOPSchema({
	active: z.boolean().optional().describe("Active"),
	interface: z.string().optional().describe("Interface"),
	kinetversion: z.string().optional().describe("Kinet Version"),
	format: z.string().optional().describe("Format"),
	routingtable: z.string().optional().describe("Routing Table"),
	sendartsync: z.boolean().optional().describe("Send ArtSync"),
	device: z.string().optional().describe("Device"),
	serialport: z.string().optional().describe("Serial Port"),
	rate: z.number().optional().describe("Rate"),
	net: z.number().optional().describe("Net"),
	subnet: z.number().optional().describe("Subnet"),
	universe: z.number().optional().describe("Universe"),
	cid: z.string().optional().describe("CID"),
	source: z.string().optional().describe("Source"),
	priority: z.number().optional().describe("Priority"),
	customkinetport: z.boolean().optional().describe("Custom Kinet Port"),
	kinetport: z.number().optional().describe("Kinet Port"),
	multicast: z.boolean().optional().describe("Multicast"),
	netaddress: z.string().optional().describe("Net Address"),
	localaddress: z.string().optional().describe("Local Address"),
	localport: z.number().optional().describe("Local Port"),
	customport: z.boolean().optional().describe("Custom Port"),
	netport: z.number().optional().describe("Net Port"),
});
