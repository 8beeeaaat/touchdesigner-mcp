import { z } from "zod";
import { createDATSchema } from "./utils.js";

export const webclient = createDATSchema({
	active: z.boolean().optional().describe("Active"),
	reqmethod: z.string().optional().describe("Request Method"),
	url: z.string().optional().describe("URL"),
	uploadfile: z.string().optional().describe("Upload File"),
	request: z.boolean().optional().describe("Request"),
	stop: z.boolean().optional().describe("Stop"),
	stream: z.boolean().optional().describe("Stream"),
	verifycert: z.boolean().optional().describe("Verify Certificate"),
	timeout: z.number().optional().describe("Timeout"),
	includeheader: z.boolean().optional().describe("Include Header"),
	authtype: z.string().optional().describe("Auth Type"),
	username: z.string().optional().describe("Username"),
	pw: z.string().optional().describe("Password"),
	appkey: z.string().optional().describe("App Key"),
	appsecret: z.string().optional().describe("App Secret"),
	oauthtoken: z.string().optional().describe("OAuth Token"),
	oauthsecret: z.string().optional().describe("OAuth Secret"),
	token: z.string().optional().describe("Token"),
	clear: z.boolean().optional().describe("Clear"),
	clamp: z.string().optional().describe("Clamp"),
	maxlines: z.number().optional().describe("Max Lines"),
	callbacks: z.string().optional().describe("Callbacks"),
});
