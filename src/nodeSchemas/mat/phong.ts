import { z } from "zod";
import { createMATSchema } from "./utils.js";

const phong = createMATSchema({
	diffuser: z.number().optional().describe("Diffuse Red"),
	diffuseg: z.number().optional().describe("Diffuse Green"),
	diffuseb: z.number().optional().describe("Diffuse Blue"),
	frontfacelit: z.string().optional().describe("Front Face Lit"),
	backfacelit: z.string().optional().describe("Back Face Lit"),
	ambient: z.number().optional().describe("Ambient"),
	ambientr: z.number().optional().describe("Ambient Red"),
	ambientg: z.number().optional().describe("Ambient Green"),
	ambientb: z.number().optional().describe("Ambient Blue"),
	emitr: z.number().optional().describe("Emission Red"),
	emitg: z.number().optional().describe("Emission Green"),
	emitb: z.number().optional().describe("Emission Blue"),
	specularlevel: z.number().optional().describe("Specular Level"),
	specularcolorr: z.number().optional().describe("Specular Color Red"),
	specularcolorg: z.number().optional().describe("Specular Color Green"),
	specularcolorb: z.number().optional().describe("Specular Color Blue"),
	shininess: z.number().optional().describe("Shininess"),
	outputshader: z.boolean().optional().describe("Output Shader"),

	diffusemap: z.any().nullable().optional().describe("Diffuse Map"),
	diffusemapextendu: z.string().optional().describe("Diffuse Map Extend U"),
	diffusemapextendv: z.string().optional().describe("Diffuse Map Extend V"),
	diffusemapextendw: z.string().optional().describe("Diffuse Map Extend W"),
	diffusemapfilter: z.string().optional().describe("Diffuse Map Filter"),
	diffusemapanisotropy: z
		.string()
		.optional()
		.describe("Diffuse Map Anisotropy"),
	diffusemapcoord: z.string().optional().describe("Diffuse Map Coordinate"),
	diffusemapcoordinterp: z
		.string()
		.optional()
		.describe("Diffuse Map Coordinate Interpolation"),

	ambientmap: z.any().nullable().optional().describe("Ambient Map"),
	ambientmapextendu: z.string().optional().describe("Ambient Map Extend U"),
	ambientmapextendv: z.string().optional().describe("Ambient Map Extend V"),
	ambientmapextendw: z.string().optional().describe("Ambient Map Extend W"),
	ambientmapfilter: z.string().optional().describe("Ambient Map Filter"),
	ambientmapanisotropy: z
		.string()
		.optional()
		.describe("Ambient Map Anisotropy"),
	ambientmapcoord: z.string().optional().describe("Ambient Map Coordinate"),
	ambientmapcoordinterp: z
		.string()
		.optional()
		.describe("Ambient Map Coordinate Interpolation"),

	emitmap: z.any().nullable().optional().describe("Emission Map"),
	emitmapextendu: z.string().optional().describe("Emission Map Extend U"),
	emitmapextendv: z.string().optional().describe("Emission Map Extend V"),
	emitmapextendw: z.string().optional().describe("Emission Map Extend W"),
	emitmapfilter: z.string().optional().describe("Emission Map Filter"),
	emitmapanisotropy: z.string().optional().describe("Emission Map Anisotropy"),
	emitmapcoord: z.string().optional().describe("Emission Map Coordinate"),
	emitmapcoordinterp: z
		.string()
		.optional()
		.describe("Emission Map Coordinate Interpolation"),

	specularmap: z.any().nullable().optional().describe("Specular Map"),
	specularmapextendu: z.string().optional().describe("Specular Map Extend U"),
	specularmapextendv: z.string().optional().describe("Specular Map Extend V"),
	specularmapextendw: z.string().optional().describe("Specular Map Extend W"),
	specularmapfilter: z.string().optional().describe("Specular Map Filter"),
	specularmapanisotropy: z
		.string()
		.optional()
		.describe("Specular Map Anisotropy"),
	specularmapcoord: z.string().optional().describe("Specular Map Coordinate"),
	specularmapcoordinterp: z
		.string()
		.optional()
		.describe("Specular Map Coordinate Interpolation"),

	normalmap: z.any().nullable().optional().describe("Normal Map"),
	normalmapextendu: z.string().optional().describe("Normal Map Extend U"),
	normalmapextendv: z.string().optional().describe("Normal Map Extend V"),
	normalmapextendw: z.string().optional().describe("Normal Map Extend W"),
	normalmapfilter: z.string().optional().describe("Normal Map Filter"),
	normalmapanisotropy: z.string().optional().describe("Normal Map Anisotropy"),
	normalmapcoord: z.string().optional().describe("Normal Map Coordinate"),
	normalmapcoordinterp: z
		.string()
		.optional()
		.describe("Normal Map Coordinate Interpolation"),
	bumpscale: z.number().optional().describe("Bump Scale"),

	heightmapenable: z.boolean().optional().describe("Height Map Enable"),
	heightmap: z.any().nullable().optional().describe("Height Map"),
	heightmapextendu: z.string().optional().describe("Height Map Extend U"),
	heightmapextendv: z.string().optional().describe("Height Map Extend V"),
	heightmapextendw: z.string().optional().describe("Height Map Extend W"),
	heightmapfilter: z.string().optional().describe("Height Map Filter"),
	heightmapanisotropy: z.string().optional().describe("Height Map Anisotropy"),
	heightmapcoord: z.string().optional().describe("Height Map Coordinate"),
	heightmapcoordinterp: z
		.string()
		.optional()
		.describe("Height Map Coordinate Interpolation"),
	parallaxscale: z.number().optional().describe("Parallax Scale"),
	parallaxocclusion: z.boolean().optional().describe("Parallax Occlusion"),
	displaceverts: z.boolean().optional().describe("Displace Vertices"),
	displacescale: z.number().optional().describe("Displace Scale"),
	displacemid: z.number().optional().describe("Displace Mid"),

	alphamap: z.any().nullable().optional().describe("Alpha Map"),
	alphamapextendu: z.string().optional().describe("Alpha Map Extend U"),
	alphamapextendv: z.string().optional().describe("Alpha Map Extend V"),
	alphamapextendw: z.string().optional().describe("Alpha Map Extend W"),
	alphamapfilter: z.string().optional().describe("Alpha Map Filter"),
	alphamapanisotropy: z.string().optional().describe("Alpha Map Anisotropy"),
	alphamapcoord: z.string().optional().describe("Alpha Map Coordinate"),
	alphamapcoordinterp: z
		.string()
		.optional()
		.describe("Alpha Map Coordinate Interpolation"),

	alphamode: z.boolean().optional().describe("Alpha Mode"),
	alphafront: z.number().optional().describe("Alpha Front"),
	alphaside: z.number().optional().describe("Alpha Side"),
	rolloff: z.number().optional().describe("Rolloff"),
	rimlight: z.number().optional().describe("Rimlight"),

	shadowstrength: z.number().optional().describe("Shadow Strength"),
	shadowcolorr: z.number().optional().describe("Shadow Color Red"),
	shadowcolorg: z.number().optional().describe("Shadow Color Green"),
	shadowcolorb: z.number().optional().describe("Shadow Color Blue"),

	darknessemit: z.boolean().optional().describe("Darkness Emit"),
	darknessemitcolorr: z.number().optional().describe("Darkness Emit Color Red"),
	darknessemitcolorg: z
		.number()
		.optional()
		.describe("Darkness Emit Color Green"),
	darknessemitcolorb: z
		.number()
		.optional()
		.describe("Darkness Emit Color Blue"),
	darknessemitmap: z.any().nullable().optional().describe("Darkness Emit Map"),
	darknessemitmapextendu: z
		.string()
		.optional()
		.describe("Darkness Emit Map Extend U"),
	darknessemitmapextendv: z
		.string()
		.optional()
		.describe("Darkness Emit Map Extend V"),
	darknessemitmapextendw: z
		.string()
		.optional()
		.describe("Darkness Emit Map Extend W"),
	darknessemitmapfilter: z
		.string()
		.optional()
		.describe("Darkness Emit Map Filter"),
	darknessemitmapanisotropy: z
		.string()
		.optional()
		.describe("Darkness Emit Map Anisotropy"),
	darknessemitmapcoord: z
		.string()
		.optional()
		.describe("Darkness Emit Map Coordinate"),
	darknessemitmapcoordinterp: z
		.string()
		.optional()
		.describe("Darkness Emit Map Coordinate Interpolation"),

	writecameradepthtoalpha: z
		.boolean()
		.optional()
		.describe("Write Camera Depth to Alpha"),
	applypointcolor: z.boolean().optional().describe("Apply Point Color"),
	instancetexture: z.string().optional().describe("Instance Texture"),
	color: z.number().optional().describe("Color"),
});

export { phong };
