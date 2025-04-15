import type { z } from "zod";
import { add } from "./add.js";
import { analyze } from "./analyze.js";
import { antialias } from "./antialias.js";
import { blobtrack } from "./blobtrack.js";
import { bloom } from "./bloom.js";
import { blur } from "./blur.js";
import { cache } from "./cache.js";
import { cacheselect } from "./cacheselect.js";
import { channelmix } from "./channelmix.js";
import { chopto } from "./chopto.js";
import { chromakey } from "./chromakey.js";
import { circle } from "./circle.js";
import { composite } from "./composite.js";
import { constant } from "./constant.js";
import { convolve } from "./convolve.js";
import { cornerpin } from "./cornerpin.js";
import { cplusplus } from "./cplusplus.js";
import { crop } from "./crop.js";
import { cross } from "./cross.js";
import { cubemap } from "./cubemap.js";
import { depth } from "./depth.js";
import { difference } from "./difference.js";
import { directxin } from "./directxin.js";
import { directxout } from "./directxout.js";
import { displace } from "./displace.js";
import { edge } from "./edge.js";
import { emboss } from "./emboss.js";
import { feedback } from "./feedback.js";
import { fit } from "./fit.js";
import { flip } from "./flip.js";
import { functionNode } from "./function.js";
import { glsl } from "./glsl.js";
import { glslmulti } from "./glslmulti.js";
import { hsvadjust } from "./hsvadjust.js";
import { hsvtorgb } from "./hsvtorgb.js";
import { importselect } from "./importselect.js";
import { inNode } from "./in.js";
import { inside } from "./inside.js";
import { kinect } from "./kinect.js";
import { kinectazure } from "./kinectazure.js";
import { kinectazureselect } from "./kinectazureselect.js";
import { layout } from "./layout.js";
import { leapmotion } from "./leapmotion.js";
import { lensdistort } from "./lensdistort.js";
import { level } from "./level.js";
import { limit } from "./limit.js";
import { lookup } from "./lookup.js";
import { lumablur } from "./lumablur.js";
import { lumalevel } from "./lumalevel.js";
import { math } from "./math.js";
import { matte } from "./matte.js";
import { mirror } from "./mirror.js";
import { monochrome } from "./monochrome.js";
import { mosys } from "./mosys.js";
import { moviefilein } from "./moviefilein.js";
import { moviefileout } from "./moviefileout.js";
import { mpcdi } from "./mpcdi.js";
import { multiply } from "./multiply.js";
import { ncam } from "./ncam.js";
import { ndiin } from "./ndiin.js";
import { ndiout } from "./ndiout.js";
import { noise } from "./noise.js";
import { normalmap } from "./normalmap.js";
import { notch } from "./notch.js";
import { nullNode } from "./null.js";
import { nvidiabackground } from "./nvidiabackground.js";
import { nvidiadenoise } from "./nvidiadenoise.js";
import { nvidiaflex } from "./nvidiaflex.js";
import { nvidiaflow } from "./nvidiaflow.js";
import { nvidiaupscaler } from "./nvidiaupscaler.js";
import { oakselect } from "./oakselect.js";
import { oculusrift } from "./oculusrift.js";
import { opencolorio } from "./opencolorio.js";
import { openvr } from "./openvr.js";
import { opticalflow } from "./opticalflow.js";
import { opviewer } from "./opviewer.js";
import { orbbec } from "./orbbec.js";
import { orbbecselect } from "./orbbecselect.js";
import { ouster } from "./ouster.js";
import { ousterselect } from "./ousterselect.js";
import { out } from "./out.js";
import { outside } from "./outside.js";
import { over } from "./over.js";
import { pack } from "./pack.js";
import { photoshopin } from "./photoshopin.js";
import { pointfilein } from "./pointfilein.js";
import { pointfileselect } from "./pointfileselect.js";
import { pointtransform } from "./pointtransform.js";
import { prefiltermap } from "./prefiltermap.js";
import { projection } from "./projection.js";
import { ramp } from "./ramp.js";
import { realsense } from "./realsense.js";
import { rectangle } from "./rectangle.js";
import { remap } from "./remap.js";
import { render } from "./render.js";
import { renderpass } from "./renderpass.js";
import { renderselect } from "./renderselect.js";
import { renderstreamin } from "./renderstreamin.js";
import { renderstreamout } from "./renderstreamout.js";
import { reorder } from "./reorder.js";
import { resolution } from "./resolution.js";
import { rgbkey } from "./rgbkey.js";
import { rgbtohsv } from "./rgbtohsv.js";
import { scalabledisplay } from "./scalabledisplay.js";
import { screen } from "./screen.js";
import { screengrab } from "./screengrab.js";
import { script } from "./script.js";
import { select } from "./select.js";
import { sharedmemin } from "./sharedmemin.js";
import { sharedmemout } from "./sharedmemout.js";
import { sick } from "./sick.js";
import { slope } from "./slope.js";
import { spectrum } from "./spectrum.js";
import { ssao } from "./ssao.js";
import { stype } from "./stype.js";
import { substance } from "./substance.js";
import { substanceselect } from "./substanceselect.js";
import { subtract } from "./subtract.js";
import { switchNode } from "./switch.js";
import { syphonspoutin } from "./syphonspoutin.js";
import { syphonspoutout } from "./syphonspoutout.js";
import { text } from "./text.js";
import { texture3d } from "./texture3d.js";
import { threshold } from "./threshold.js";
import { tile } from "./tile.js";
import { timemachine } from "./timemachine.js";
import { touchin } from "./touchin.js";
import { touchout } from "./touchout.js";
import { transform } from "./transform.js";
import { under } from "./under.js";
import { createTOPSchema } from "./utils.js";
import { videodevicein } from "./videodevicein.js";
import { videodeviceout } from "./videodeviceout.js";
import { videostreamin } from "./videostreamin.js";
import { videostreamout } from "./videostreamout.js";
import { vioso } from "./vioso.js";
import { webrender } from "./webrender.js";
import { zed } from "./zed.js";

/**
 * Schemas for TouchDesigner TOP node parameters
 * Using internal TouchDesigner node type names (lowercase) for consistency
 */
export const TopNodeSchemas = {
	add,
	analyze,
	antialias,
	blobtrack,
	bloom,
	blur,
	cache,
	cacheselect,
	channelmix,
	chopto,
	chromakey,
	circle,
	composite,
	constant,
	convolve,
	cornerpin,
	cplusplus,
	crop,
	cross,
	cubemap,
	depth,
	difference,
	directxin,
	directxout,
	displace,
	edge,
	emboss,
	feedback,
	fit,
	flex: nvidiaflex,
	flip,
	flow: nvidiaflow,
	function: functionNode,
	glsl,
	glslmulti,
	hsvadjust,
	hsvtorgb,
	importselect,
	in: inNode,
	inside,
	kinect,
	kinectazure,
	kinectazureselect,
	layout,
	leapmotion,
	lensdistort,
	level,
	limit,
	lookup,
	lumablur,
	lumalevel,
	math,
	matte,
	mirror,
	monochrome,
	mosys,
	moviefilein,
	moviefileout,
	mpcdi,
	multiply,
	ncam,
	ndiin,
	ndiout,
	noise,
	normalmap,
	notch,
	null: nullNode,
	nvidiabackground,
	nvidiadenoise,
	nvidiaupscaler,
	oakselect,
	oculusrift,
	opencolorio,
	openvr,
	opticalflow,
	opviewer,
	orbbec,
	orbbecselect,
	ouster,
	ousterselect,
	out,
	outside,
	over,
	pack,
	photoshopin,
	pointfilein,
	pointfileselect,
	pointtransform,
	prefiltermap,
	projection,
	ramp,
	realsense,
	rectangle,
	remap,
	render,
	renderpass,
	renderselect,
	renderstreamin,
	renderstreamout,
	reorder,
	resolution,
	rgbkey,
	rgbtohsv,
	scalabledisplay,
	screen,
	screengrab,
	script,
	select,
	sharedmemin,
	sharedmemout,
	sick,
	slope,
	spectrum,
	ssao,
	stype,
	substance,
	substanceselect,
	subtract,
	switch: switchNode,
	syphonspoutin,
	syphonspoutout,
	text,
	texture3d,
	threshold,
	tile,
	timemachine,
	touchin,
	touchout,
	transform,
	under,
	videodevicein,
	videodeviceout,
	videostreamin,
	videostreamout,
	vioso,
	webrender,
	zed,
};

export type TopNodeSchema = z.infer<
	(typeof TopNodeSchemas)[keyof typeof TopNodeSchemas]
>;
export type TopNodeType = keyof typeof TopNodeSchemas;
export const TopNodeTypes = Object.keys(TopNodeSchemas) as TopNodeType[];

export { createTOPSchema };
