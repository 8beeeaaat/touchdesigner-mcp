import { z } from "zod";
import { createMATSchema } from "./utils.js";

const glsl = createMATSchema({
	glslversion: z.string().optional().describe("GLSL Version"),
	predat: z.any().nullable().optional().describe("Pre DAT"),
	vdat: z.string().optional().describe("Vertex DAT"),
	pdat: z.string().optional().describe("Pixel DAT"),
	loaduniformnames: z.boolean().optional().describe("Load Uniform Names"),
	clearuniformnames: z.boolean().optional().describe("Clear Uniform Names"),
	gdat: z.any().nullable().optional().describe("Geometry DAT"),
	inherit: z.any().nullable().optional().describe("Inherit"),
	lightingspace: z.string().optional().describe("Lighting Space"),

	// 属性関連パラメータ
	attr: z.number().optional().describe("Attributes"),
	attr0name: z.string().optional().describe("Attribute 0 Name"),
	attr0type: z.string().optional().describe("Attribute 0 Type"),
	attr0size: z.number().optional().describe("Attribute 0 Size"),

	// 行列属性関連パラメータ
	mattr: z.number().optional().describe("Matrix Attributes"),
	mattr0name: z.string().optional().describe("Matrix Attribute 0 Name"),
	mattr0comps: z.number().optional().describe("Matrix Attribute 0 Components"),
	mattr0cols: z.number().optional().describe("Matrix Attribute 0 Columns"),
	mattr0arraysize: z
		.number()
		.optional()
		.describe("Matrix Attribute 0 Array Size"),

	// サンプラー関連パラメータ
	sampler: z.number().optional().describe("Samplers"),
	sampler0name: z.string().optional().describe("Sampler 0 Name"),
	sampler0top: z.any().nullable().optional().describe("Sampler 0 TOP"),
	sampler0extendu: z.string().optional().describe("Sampler 0 Extend U"),
	sampler0extendv: z.string().optional().describe("Sampler 0 Extend V"),
	sampler0extendw: z.string().optional().describe("Sampler 0 Extend W"),
	sampler0filter: z.string().optional().describe("Sampler 0 Filter"),
	sampler0anisotropy: z.string().optional().describe("Sampler 0 Anisotropy"),

	// ベクトル関連パラメータ
	vec: z.number().optional().describe("Vectors"),
	vec0name: z.string().optional().describe("Vector 0 Name"),
	vec0valuex: z.number().optional().describe("Vector 0 Value X"),
	vec0valuey: z.number().optional().describe("Vector 0 Value Y"),
	vec0valuez: z.number().optional().describe("Vector 0 Value Z"),
	vec0valuew: z.number().optional().describe("Vector 0 Value W"),

	// 配列関連パラメータ
	array: z.number().optional().describe("Arrays"),
	array0name: z.string().optional().describe("Array 0 Name"),
	array0type: z.string().optional().describe("Array 0 Type"),
	array0chop: z.any().nullable().optional().describe("Array 0 CHOP"),
	array0arraytype: z.string().optional().describe("Array 0 Array Type"),
	array0scope: z.string().optional().describe("Array 0 Scope"),

	// 行列関連パラメータ
	matrix: z.number().optional().describe("Matrices"),
	matrix0name: z.string().optional().describe("Matrix 0 Name"),
	matrix0value: z.any().nullable().optional().describe("Matrix 0 Value"),

	// リレーション関連パラメータ
	rel: z.number().optional().describe("Relations"),
	rel0name: z.string().optional().describe("Relation 0 Name"),
	rel0from: z.any().nullable().optional().describe("Relation 0 From"),
	rel0to: z.any().nullable().optional().describe("Relation 0 To"),

	// 定数関連パラメータ
	const: z.number().optional().describe("Constants"),
	const0name: z.string().optional().describe("Constant 0 Name"),
	const0value: z.number().optional().describe("Constant 0 Value"),
});

export { glsl };
