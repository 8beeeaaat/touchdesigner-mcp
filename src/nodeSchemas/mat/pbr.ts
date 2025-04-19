import { z } from "zod";
import { createMATSchema } from "./utils.js";

const pbr = createMATSchema({
	basecolorr: z.number().optional().describe("Base Color Red"),
	basecolorg: z.number().optional().describe("Base Color Green"),
	basecolorb: z.number().optional().describe("Base Color Blue"),
	specularlevel: z.number().optional().describe("Specular Level"),
	metallic: z.number().optional().describe("Metallic"),
	roughness: z.number().optional().describe("Roughness"),
	ambientocclusion: z.number().optional().describe("Ambient Occlusion"),
	envlightquality: z.number().optional().describe("Environment Light Quality"),
	emitr: z.number().optional().describe("Emission Red"),
	emitg: z.number().optional().describe("Emission Green"),
	emitb: z.number().optional().describe("Emission Blue"),
	constantr: z.number().optional().describe("Constant Red"),
	constantg: z.number().optional().describe("Constant Green"),
	constantb: z.number().optional().describe("Constant Blue"),
	frontfacelit: z.string().optional().describe("Front Face Lit"),
	backfacelit: z.string().optional().describe("Back Face Lit"),
	outputshader: z.boolean().optional().describe("Output Shader"),
	substance: z.any().nullable().optional().describe("Substance"),

	// 各種マップ関連パラメータ
	basecolormap: z.any().nullable().optional().describe("Base Color Map"),
	basecolormapextendu: z
		.string()
		.optional()
		.describe("Base Color Map Extend U"),
	basecolormapextendv: z
		.string()
		.optional()
		.describe("Base Color Map Extend V"),
	basecolormapextendw: z
		.string()
		.optional()
		.describe("Base Color Map Extend W"),
	basecolormapfilter: z.string().optional().describe("Base Color Map Filter"),
	basecolormapanisotropy: z
		.string()
		.optional()
		.describe("Base Color Map Anisotropy"),
	basecolormapcoord: z
		.string()
		.optional()
		.describe("Base Color Map Coordinate"),
	basecolormapcoordinterp: z
		.string()
		.optional()
		.describe("Base Color Map Coordinate Interpolation"),

	specularlevelmap: z
		.any()
		.nullable()
		.optional()
		.describe("Specular Level Map"),
	specularlevelmapextendu: z
		.string()
		.optional()
		.describe("Specular Level Map Extend U"),
	specularlevelmapextendv: z
		.string()
		.optional()
		.describe("Specular Level Map Extend V"),
	specularlevelmapextendw: z
		.string()
		.optional()
		.describe("Specular Level Map Extend W"),
	specularlevelmapfilter: z
		.string()
		.optional()
		.describe("Specular Level Map Filter"),
	specularlevelmapanisotropy: z
		.string()
		.optional()
		.describe("Specular Level Map Anisotropy"),
	specularlevelmapcoord: z
		.string()
		.optional()
		.describe("Specular Level Map Coordinate"),
	specularlevelmapcoordinterp: z
		.string()
		.optional()
		.describe("Specular Level Map Coordinate Interpolation"),
	specularlevelmapchannelsource: z
		.string()
		.optional()
		.describe("Specular Level Map Channel Source"),

	metallicmap: z.any().nullable().optional().describe("Metallic Map"),
	metalnessmapextendu: z.string().optional().describe("Metalness Map Extend U"),
	metalnessmapextendv: z.string().optional().describe("Metalness Map Extend V"),
	metalnessmapextendw: z.string().optional().describe("Metalness Map Extend W"),
	metalnessmapfilter: z.string().optional().describe("Metalness Map Filter"),
	metalnessmapanisotropy: z
		.string()
		.optional()
		.describe("Metalness Map Anisotropy"),
	metallicmapcoord: z.string().optional().describe("Metallic Map Coordinate"),
	metallicmapcoordinterp: z
		.string()
		.optional()
		.describe("Metallic Map Coordinate Interpolation"),
	metallicmapchannelsource: z
		.string()
		.optional()
		.describe("Metallic Map Channel Source"),

	roughnessmap: z.any().nullable().optional().describe("Roughness Map"),
	roughnessmapextendu: z.string().optional().describe("Roughness Map Extend U"),
	roughnessmapextendv: z.string().optional().describe("Roughness Map Extend V"),
	roughnessmapextendw: z.string().optional().describe("Roughness Map Extend W"),
	roughnessmapfilter: z.string().optional().describe("Roughness Map Filter"),
	roughnessmapanisotropy: z
		.string()
		.optional()
		.describe("Roughness Map Anisotropy"),
	roughnessmapcoord: z.string().optional().describe("Roughness Map Coordinate"),
	roughnessmapcoordinterp: z
		.string()
		.optional()
		.describe("Roughness Map Coordinate Interpolation"),
	roughnessmapchannelsource: z
		.string()
		.optional()
		.describe("Roughness Map Channel Source"),

	ambientocclusionmap: z
		.any()
		.nullable()
		.optional()
		.describe("Ambient Occlusion Map"),
	ambientocclusionmapextendu: z
		.string()
		.optional()
		.describe("Ambient Occlusion Map Extend U"),
	ambientocclusionmapextendv: z
		.string()
		.optional()
		.describe("Ambient Occlusion Map Extend V"),
	ambientocclusionmapextendw: z
		.string()
		.optional()
		.describe("Ambient Occlusion Map Extend W"),
	ambientocclusionmapfilter: z
		.string()
		.optional()
		.describe("Ambient Occlusion Map Filter"),
	ambientocclusionmapanisotropy: z
		.string()
		.optional()
		.describe("Ambient Occlusion Map Anisotropy"),
	ambientocclusionmapcoord: z
		.string()
		.optional()
		.describe("Ambient Occlusion Map Coordinate"),
	ambientocclusionmapcoordinterp: z
		.string()
		.optional()
		.describe("Ambient Occlusion Map Coordinate Interpolation"),
	ambientocclusionmapchannelsource: z
		.string()
		.optional()
		.describe("Ambient Occlusion Map Channel Source"),

	// 法線マップ、高さマップ関連パラメータ
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
	heightmapchannelsource: z
		.string()
		.optional()
		.describe("Height Map Channel Source"),
	parallaxscale: z.number().optional().describe("Parallax Scale"),
	parallaxocclusion: z.boolean().optional().describe("Parallax Occlusion"),
	displaceverts: z.boolean().optional().describe("Displace Vertices"),
	displacescale: z.number().optional().describe("Displace Scale"),
	displacemid: z.number().optional().describe("Displace Mid"),

	// エミッションとアルファマップ関連パラメータ
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

	// アルファモードとリムライト関連パラメータ
	alphamode: z.boolean().optional().describe("Alpha Mode"),
	alphafront: z.number().optional().describe("Alpha Front"),
	alphaside: z.number().optional().describe("Alpha Side"),
	rolloff: z.number().optional().describe("Rolloff"),
	rimlight: z.number().optional().describe("Rimlight"),

	// リムライト0の詳細設定
	rimlight0enable: z.boolean().optional().describe("Rimlight 0 Enable"),
	rimlight0map: z.any().nullable().optional().describe("Rimlight 0 Map"),
	rimlight0mapextendu: z
		.string()
		.optional()
		.describe("Rimlight 0 Map Extend U"),
	rimlight0mapextendv: z
		.string()
		.optional()
		.describe("Rimlight 0 Map Extend V"),
	rimlight0mapextendw: z
		.string()
		.optional()
		.describe("Rimlight 0 Map Extend W"),
	rimlight0mapfilter: z.string().optional().describe("Rimlight 0 Map Filter"),
	rimlight0mapanisotropy: z
		.string()
		.optional()
		.describe("Rimlight 0 Map Anisotropy"),
	rimlight0mapcoord: z
		.string()
		.optional()
		.describe("Rimlight 0 Map Coordinate"),
	rimlight0mapcoordinterp: z
		.string()
		.optional()
		.describe("Rimlight 0 Map Coordinate Interpolation"),
	rimlight0colorr: z.number().optional().describe("Rimlight 0 Color Red"),
	rimlight0colorg: z.number().optional().describe("Rimlight 0 Color Green"),
	rimlight0colorb: z.number().optional().describe("Rimlight 0 Color Blue"),
	rimlight0center: z.number().optional().describe("Rimlight 0 Center"),
	rimlight0width: z.number().optional().describe("Rimlight 0 Width"),
	rimlight0strength: z.number().optional().describe("Rimlight 0 Strength"),
	rimlight0strengthramp: z
		.any()
		.nullable()
		.optional()
		.describe("Rimlight 0 Strength Ramp"),

	// シャドウとダークネスエミット関連パラメータ
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

	// その他のパラメータ
	writecameradepthtoalpha: z
		.boolean()
		.optional()
		.describe("Write Camera Depth to Alpha"),
	applypointcolor: z.boolean().optional().describe("Apply Point Color"),
	instancetexture: z.string().optional().describe("Instance Texture"),
	color: z.number().optional().describe("Color"),
	color0output: z.string().optional().describe("Color 0 Output"),
});

export { pbr };
