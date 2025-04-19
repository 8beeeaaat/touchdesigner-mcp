import { z } from "zod";
import { createMATSchema } from "./utils.js";

const pointsprite = createMATSchema({
	// ポイントスプライト固有のパラメータ
	spritetype: z.string().optional().describe("Sprite Type"),
	sizescale: z.number().optional().describe("Size Scale"),
	sizemin: z.number().optional().describe("Size Minimum"),
	sizemax: z.number().optional().describe("Size Maximum"),
	spritesize: z.number().optional().describe("Sprite Size"),
	usespriteclass: z.boolean().optional().describe("Use Sprite Class"),
	spriteclass: z.string().optional().describe("Sprite Class"),
	colorr: z.number().optional().describe("Color Red"),
	colorg: z.number().optional().describe("Color Green"),
	colorb: z.number().optional().describe("Color Blue"),
	alpha: z.number().optional().describe("Alpha"),
	colorramp: z.any().nullable().optional().describe("Color Ramp"),

	// ビルボードとオリエンテーション関連パラメータ
	billboard: z.boolean().optional().describe("Billboard"),
	orientedaligned: z.boolean().optional().describe("Oriented Aligned"),
	orientationx: z.number().optional().describe("Orientation X"),
	orientationy: z.number().optional().describe("Orientation Y"),
	orientationz: z.number().optional().describe("Orientation Z"),
	orientationw: z.number().optional().describe("Orientation W"),

	// レンダリング関連パラメータ
	additive: z.boolean().optional().describe("Additive"),
	applypointcolor: z.boolean().optional().describe("Apply Point Color"),
	intensityscale: z.number().optional().describe("Intensity Scale"),
	intensitymin: z.number().optional().describe("Intensity Minimum"),
	intensitymax: z.number().optional().describe("Intensity Maximum"),
	attenuationscale: z.number().optional().describe("Attenuation Scale"),
	attenuationmin: z.number().optional().describe("Attenuation Minimum"),
	attenuationmax: z.number().optional().describe("Attenuation Maximum"),
	whiteinwhiteout: z.boolean().optional().describe("White in White out"),
	blackinblackout: z.boolean().optional().describe("Black in Black out"),
	distanceminclip: z.boolean().optional().describe("Distance Minimum Clip"),
	distancemin: z.number().optional().describe("Distance Minimum"),
	distancemaxclip: z.boolean().optional().describe("Distance Maximum Clip"),
	distancemax: z.number().optional().describe("Distance Maximum"),
	fadeintensity: z.number().optional().describe("Fade Intensity"),
	faderadius: z.number().optional().describe("Fade Radius"),

	// テクスチャ関連パラメータ
	texturetop: z.any().nullable().optional().describe("Texture TOP"),
	texturexoffset: z.number().optional().describe("Texture X Offset"),
	textureyoffset: z.number().optional().describe("Texture Y Offset"),
	texturexscale: z.number().optional().describe("Texture X Scale"),
	textureyscale: z.number().optional().describe("Texture Y Scale"),
	renderoffset: z.number().optional().describe("Render Offset"),
	maxsplits: z.number().optional().describe("Maximum Splits"),

	// フォグ関連パラメータ
	fog: z.boolean().optional().describe("Fog"),
	fogstartdistance: z.number().optional().describe("Fog Start Distance"),
	fogenddistance: z.number().optional().describe("Fog End Distance"),
	fogr: z.number().optional().describe("Fog Red"),
	fogg: z.number().optional().describe("Fog Green"),
	fogb: z.number().optional().describe("Fog Blue"),

	// トレイル関連パラメータ
	trail: z.boolean().optional().describe("Trail"),
	traillen: z.number().optional().describe("Trail Length"),
	trailtype: z.string().optional().describe("Trail Type"),
	trailoffset: z.string().optional().describe("Trail Offset"),
	trailattenuate: z.boolean().optional().describe("Trail Attenuate"),
	trailtaper: z.boolean().optional().describe("Trail Taper"),
	trailwidth: z.number().optional().describe("Trail Width"),
	trailmap: z.any().nullable().optional().describe("Trail Map"),
});

export { pointsprite };
