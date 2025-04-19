import { z } from "zod";
import { createMATSchema } from "./utils.js";

const line = createMATSchema({
	depthinterpolationmodel: z
		.string()
		.optional()
		.describe("Depth Interpolation Model"),
	inversedistanceexponent: z
		.number()
		.optional()
		.describe("Inverse Distance Exponent"),
	distancenear: z.number().optional().describe("Distance Near"),
	distancefar: z.number().optional().describe("Distance Far"),
	widthnear: z.number().optional().describe("Width Near"),
	widthfar: z.number().optional().describe("Width Far"),
	widthaffectedbyfov: z.boolean().optional().describe("Width Affected by FOV"),
	widthbias: z.number().optional().describe("Width Bias"),
	widthsteepness: z.number().optional().describe("Width Steepness"),
	widthlinearize: z.number().optional().describe("Width Linearize"),
	colorbias: z.number().optional().describe("Color Bias"),
	colorsteepness: z.number().optional().describe("Color Steepness"),
	colorlinearize: z.number().optional().describe("Color Linearize"),
	liftdirection: z.string().optional().describe("Lift Direction"),
	liftscale: z.number().optional().describe("Lift Scale"),
	numptsincircle: z.number().optional().describe("Number of Points in Circle"),
	drawlines: z.boolean().optional().describe("Draw Lines"),
	linejointtype: z.string().optional().describe("Line Joint Type"),
	miterthreshold: z.number().optional().describe("Miter Threshold"),
	linestartcaptype: z.string().optional().describe("Line Start Cap Type"),
	lineendcaptype: z.string().optional().describe("Line End Cap Type"),
	lineendtaperstrength: z
		.number()
		.optional()
		.describe("Line End Taper Strength"),
	linenearcolorr: z.number().optional().describe("Line Near Color Red"),
	linenearcolorg: z.number().optional().describe("Line Near Color Green"),
	linenearcolorb: z.number().optional().describe("Line Near Color Blue"),
	linenearalpha: z.number().optional().describe("Line Near Alpha"),
	specifylinefarcolor: z
		.boolean()
		.optional()
		.describe("Specify Line Far Color"),
	linefarcolorr: z.number().optional().describe("Line Far Color Red"),
	linefarcolorg: z.number().optional().describe("Line Far Color Green"),
	linefarcolorb: z.number().optional().describe("Line Far Color Blue"),
	linefaralpha: z.number().optional().describe("Line Far Alpha"),
	drawpoints: z.boolean().optional().describe("Draw Points"),
	pointtype: z.string().optional().describe("Point Type"),
	pointsizemultiplier: z.number().optional().describe("Point Size Multiplier"),
	pointnearcolorr: z.number().optional().describe("Point Near Color Red"),
	pointnearcolorg: z.number().optional().describe("Point Near Color Green"),
	pointnearcolorb: z.number().optional().describe("Point Near Color Blue"),
	pointnearalpha: z.number().optional().describe("Point Near Alpha"),
	specifypointfarcolor: z
		.boolean()
		.optional()
		.describe("Specify Point Far Color"),
	pointfarcolorr: z.number().optional().describe("Point Far Color Red"),
	pointfarcolorg: z.number().optional().describe("Point Far Color Green"),
	pointfarcolorb: z.number().optional().describe("Point Far Color Blue"),
	pointfaralpha: z.number().optional().describe("Point Far Alpha"),
	pointliftdirection: z.string().optional().describe("Point Lift Direction"),
	pointliftscale: z.number().optional().describe("Point Lift Scale"),
	drawvectors: z.boolean().optional().describe("Draw Vectors"),
	scale: z.number().optional().describe("Scale"),
	vectorstartcaptype: z.string().optional().describe("Vector Start Cap Type"),
	vectorendcaptype: z.string().optional().describe("Vector End Cap Type"),
	vectortaperstrength: z.number().optional().describe("Vector Taper Strength"),
	vectornearcolorr: z.number().optional().describe("Vector Near Color Red"),
	vectornearcolorg: z.number().optional().describe("Vector Near Color Green"),
	vectornearcolorb: z.number().optional().describe("Vector Near Color Blue"),
	vectornearalpha: z.number().optional().describe("Vector Near Alpha"),
	specifyvectorfarcolor: z
		.boolean()
		.optional()
		.describe("Specify Vector Far Color"),
	vectorfarcolorr: z.number().optional().describe("Vector Far Color Red"),
	vectorfarcolorg: z.number().optional().describe("Vector Far Color Green"),
	vectorfarcolorb: z.number().optional().describe("Vector Far Color Blue"),
	vectorfaralpha: z.number().optional().describe("Vector Far Alpha"),
	roundwidth: z.number().optional().describe("Round Width"),
	roundheight: z.number().optional().describe("Round Height"),
	squarewidth: z.number().optional().describe("Square Width"),
	squareheight: z.number().optional().describe("Square Height"),
	trianglewidth: z.number().optional().describe("Triangle Width"),
	triangleheight: z.number().optional().describe("Triangle Height"),
	arrowwidth: z.number().optional().describe("Arrow Width"),
	arrowheight: z.number().optional().describe("Arrow Height"),
	arrowtaillength: z.number().optional().describe("Arrow Tail Length"),
	endcapwidthmultiplier: z
		.number()
		.optional()
		.describe("End Cap Width Multiplier"),
	endcapheightmultiplier: z
		.number()
		.optional()
		.describe("End Cap Height Multiplier"),
	startcappullback: z.number().optional().describe("Start Cap Pull Back"),
	endcappullback: z.number().optional().describe("End Cap Pull Back"),
	lineposatt: z.string().optional().describe("Line Position Attribute"),
	linewidthatt: z.string().optional().describe("Line Width Attribute"),
	linecoloratt: z.string().optional().describe("Line Color Attribute"),
	pointposatt: z.string().optional().describe("Point Position Attribute"),
	pointsizeatt: z.string().optional().describe("Point Size Attribute"),
	pointcoloratt: z.string().optional().describe("Point Color Attribute"),
	vectoratttype: z.string().optional().describe("Vector Attribute Type"),
	vectoratt: z.string().optional().describe("Vector Attribute"),
	vectorcusattribidx: z
		.number()
		.optional()
		.describe("Vector Custom Attribute Index"),
});

export { line };
