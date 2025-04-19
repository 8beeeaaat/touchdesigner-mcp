import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const mqttclient = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	netaddress: z.string().optional().describe("Net Address"),
	specifyid: z.boolean().optional().describe("Specify ID"),
	usercid: z.string().optional().describe("User CID"),
	keepalive: z.number().optional().describe("Keep Alive"),
	maxinflight: z.number().optional().describe("Max In Flight"),
	cleansession: z.boolean().optional().describe("Clean Session"),
	verifycert: z.boolean().optional().describe("Verify Certificate"),
	username: z.string().optional().describe("Username"),
	password: z.string().optional().describe("Password"),
	reconnect: z.boolean().optional().describe("Reconnect"),
	callbacks: z.string().optional().describe("Callbacks"),
	executeloc: z.string().optional().describe("Execute Location"),
	fromop: z.string().optional().describe("From Op"),
	clamp: z.boolean().optional().describe("Clamp"),
	maxlines: z.number().optional().describe("Max Lines"),
	clear: z.boolean().optional().describe("Clear"),
	bytes: z.boolean().optional().describe("Bytes"),
});
