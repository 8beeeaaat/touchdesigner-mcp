import { z } from "zod";
import { createSOPSchema } from "./utils.js";

const kinect = createSOPSchema({
	hwversion: z.string().optional().describe("Hardware Version"),
	sensor: z.string().optional().describe("Sensor"),
	skeleton: z.string().optional().describe("Skeleton"),
	neardepthmode: z.boolean().optional().describe("Near Depth Mode"),
	normals: z.boolean().optional().describe("Normals"),
});

export { kinect };
