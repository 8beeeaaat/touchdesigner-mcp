import type { z } from "zod";
import { actor } from "./actor.js";
import { ambientlight } from "./ambientlight.js";
import { animation } from "./animation.js";
import { annotate } from "./annotate.js";
import { base } from "./base.js";
import { blend } from "./blend.js";
import { bone } from "./bone.js";
import { bulletsolver } from "./bulletsolver.js";
import { button } from "./button.js";
import { camera } from "./camera.js";
import { camerablend } from "./camerablend.js";
import { chop } from "./chop.js";
import { constraint } from "./constraint.js";
import { container } from "./container.js";
import { custom } from "./custom.js";
import { dat } from "./dat.js";
import { engine } from "./engine.js";
import { environmentlight } from "./environmentlight.js";
import { fbx } from "./fbx.js";
import { field } from "./field.js";
import { geometry } from "./geometry.js";
import { geotext } from "./geotext.js";
import { glsl } from "./glsl.js";
import { handle } from "./handle.js";
import { light } from "./light.js";
import { list } from "./list.js";
import { nullNode } from "./null.js";
import { nvidiaflexsolver } from "./nvidiaflexsolver.js";
import { nvidiaflowemitter } from "./nvidiaflowemitter.js";
import { opviewer } from "./opviewer.js";
import { parameter } from "./parameter.js";
import { replicator } from "./replicator.js";
import { select } from "./select.js";
import { sharedmemin } from "./sharedmemin.js";
import { sharedmemout } from "./sharedmemout.js";
import { slider } from "./slider.js";
import { sop } from "./sop.js";
import { table } from "./table.js";
import { text } from "./text.js";
import { time } from "./time.js";
import { usd } from "./usd.js";
import { createCOMPSchema } from "./utils.js";
import { widget } from "./widget.js";
import { window } from "./window.js";

/**
 * Schemas for TouchDesigner COMP node parameters
 * Using internal TouchDesigner node type names (lowercase) for consistency
 */
export const CompNodeSchemas = {
	actor,
	ambientlight,
	animation,
	annotate,
	base,
	blend,
	bone,
	bulletsolver,
	button,
	camera,
	camerablend,
	chop,
	constraint,
	container,
	custom,
	dat,
	engine,
	environmentlight,
	fbx,
	field,
	geotext,
	geometry,
	glsl,
	handle,
	light,
	list,
	null: nullNode,
	flexsolver: nvidiaflexsolver,
	flowemitter: nvidiaflowemitter,
	opviewer,
	parameter,
	replicator,
	select,
	sharedmemin,
	sharedmemout,
	slider,
	sop,
	table,
	text,
	time,
	usd,
	widget,
	window,
};

export type CompNodeSchema = z.infer<
	(typeof CompNodeSchemas)[keyof typeof CompNodeSchemas]
>;
export type CompNodeType = keyof typeof CompNodeSchemas;
export const CompNodeTypes = Object.keys(CompNodeSchemas) as CompNodeType[];

export { createCOMPSchema };
