import { z } from "zod";
import { createTOPSchema } from "./utils.js";

const videostreamout = createTOPSchema({
	pageindex: z.number().optional(),
	active: z.boolean().optional(),
	mode: z.string().optional(),
	name: z.string().optional(),
	port: z.number().optional(),
	rtspport: z.number().optional(),
	auth: z.boolean().optional(),
	username: z.string().optional(),
	password: z.string().optional(),
	webrtc: z.any().optional(),
	webrtcconnection: z.string().optional(),
	streamname: z.string().optional(),
	servername: z.string().optional(),
	description: z.string().optional(),
	videocodec: z.string().optional(),
	audiocodec: z.string().optional(),
	videokeyframes: z.number().optional(),
	videoencodequality: z.number().optional(),
	videodatarate: z.number().optional(),
	audiodatarate: z.number().optional(),
	audiochop: z.any().optional(),
	hwaccelerate: z.boolean().optional(),
});

export { videostreamout };
