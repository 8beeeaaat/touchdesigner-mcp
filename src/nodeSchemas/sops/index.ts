import type { z } from "zod";
import { add } from "./add.js";
import { alembic } from "./alembic.js";
import { align } from "./align.js";
import { arm } from "./arm.js";
import { attribute } from "./attribute.js";
import { attributecreate } from "./attributecreate.js";
import { basis } from "./basis.js";
import { blend } from "./blend.js";
import { bonegroup } from "./bonegroup.js";
import { boolean } from "./boolean.js";
import { box } from "./box.js";
import { bridge } from "./bridge.js";
import { cache } from "./cache.js";
import { cap } from "./cap.js";
import { capture } from "./capture.js";
import { captureregion } from "./captureregion.js";
import { carve } from "./carve.js";
import { chopto } from "./chopto.js";
import { circle } from "./circle.js";
import { clay } from "./clay.js";
import { clip } from "./clip.js";
import { convert } from "./convert.js";
import { copy } from "./copy.js";
import { cplusplus } from "./cplusplus.js";
import { creep } from "./creep.js";
import { curveclay } from "./curveclay.js";
import { curvesect } from "./curvesect.js";
import { datto } from "./datto.js";
import { deform } from "./deform.js";
import { deleteNode } from "./delete.js";
import { divide } from "./divide.js";
import { extrude } from "./extrude.js";
import { facet } from "./facet.js";
import { facetrack } from "./facetrack.js";
import { fileNode } from "./file.js";
import { fillet } from "./fillet.js";
import { fit } from "./fit.js";
import { force } from "./force.js";
import { fractall } from "./fractall.js";
import { grid } from "./grid.js";
import { group } from "./group.js";
import { hole } from "./hole.js";
import { importselect } from "./importselect.js";
import { inNode } from "./in.js";
import { inversecurve } from "./inversecurve.js";
import { isosurface } from "./isosurface.js";
import { join } from "./join.js";
import { joint } from "./joint.js";
import { kinect } from "./kinect.js";
import { lattice } from "./lattice.js";
import { limit } from "./limit.js";
import { line } from "./line.js";
import { linethick } from "./linethick.js";
import { lod } from "./lod.js";
import { lsystem } from "./lsystem.js";
import { magnet } from "./magnet.js";
import { material } from "./material.js";
import { merge } from "./merge.js";
import { metaball } from "./metaball.js";
import { model } from "./model.js";
import { noise } from "./noise.js";
import { nullNode } from "./null.js";
import { objectmerge } from "./objectmerge.js";
import { oculusrift } from "./oculusrift.js";
import { openvr } from "./openvr.js";
import { out } from "./out.js";
import { particle } from "./particle.js";
import { point } from "./point.js";
import { polyloft } from "./polyloft.js";
import { polypatch } from "./polypatch.js";
import { polyreduce } from "./polyreduce.js";
import { polyspline } from "./polyspline.js";
import { polystitch } from "./polystitch.js";
import { primitive } from "./primitive.js";
import { profile } from "./profile.js";
import { project } from "./project.js";
import { rails } from "./rails.js";
import { raster } from "./raster.js";
import { ray } from "./ray.js";
import { rectangle } from "./rectangle.js";
import { refine } from "./refine.js";
import { resample } from "./resample.js";
import { revolve } from "./revolve.js";
import { script } from "./script.js";
import { select } from "./select.js";
import { sequenceblend } from "./sequenceblend.js";
import { skin } from "./skin.js";
import { sort } from "./sort.js";
import { sphere } from "./sphere.js";
import { spring } from "./spring.js";
import { sprinkle } from "./sprinkle.js";
import { sprite } from "./sprite.js";
import { stitch } from "./stitch.js";
import { subdivide } from "./subdivide.js";
import { superquad } from "./superquad.js";
import { surfsect } from "./surfsect.js";
import { sweep } from "./sweep.js";
import { switchNode } from "./switch.js";
import { text } from "./text.js";
import { texture } from "./texture.js";
import { torus } from "./torus.js";
import { trace } from "./trace.js";
import { trail } from "./trail.js";
import { transform } from "./transform.js";
import { trim } from "./trim.js";
import { tristrip } from "./tristrip.js";
import { tube } from "./tube.js";
import { twist } from "./twist.js";
import { createSOPSchema } from "./utils.js";
import { vertex } from "./vertex.js";
import { wireframe } from "./wireframe.js";
import { zed } from "./zed.js";

/**
 * Schemas for TouchDesigner SOP node parameters
 * Using internal TouchDesigner node type names (lowercase) for consistency
 */
export const SopNodeSchemas = {
	add,
	alembic,
	align,
	arm,
	attribute,
	attributecreate,
	basis,
	blend,
	bonegroup,
	boolean,
	box,
	bridge,
	cache,
	cap,
	carve,
	capture,
	captureregion,
	chopto,
	circle,
	clay,
	clip,
	convert,
	copy,
	cplusplus,
	creep,
	curveclay,
	curvesect,
	datto,
	deform,
	delete: deleteNode,
	divide,
	extrude,
	facet,
	facetrack,
	filein: fileNode,
	fillet,
	fit,
	force,
	fractall,
	grid,
	group,
	hole,
	importselect,
	in: inNode,
	inversecurve,
	isosurface,
	join,
	joint,
	kinect,
	lattice,
	limit,
	line,
	linethick,
	lod,
	lsystem,
	magnet,
	material,
	merge,
	metaball,
	model,
	noise,
	null: nullNode,
	objectmerge,
	oculusrift,
	openvr,
	out,
	particle,
	point,
	polyloft,
	polypatch,
	polyreduce,
	polyspline,
	polystitch,
	primitive,
	profile,
	project,
	rails,
	raster,
	ray,
	rectangle,
	refine,
	resample,
	revolve,
	script,
	select,
	sequenceblend,
	skin,
	sort,
	sphere,
	spring,
	sprinkle,
	sprite,
	stitch,
	subdivide,
	superquad,
	surfsect,
	sweep,
	switch: switchNode,
	text,
	texture,
	torus,
	trace,
	trail,
	transform,
	trim,
	tristrip,
	tube,
	twist,
	vertex,
	wireframe,
	zed,
};

export type SopNodeSchema = z.infer<
	(typeof SopNodeSchemas)[keyof typeof SopNodeSchemas]
>;
export type SopNodeType = keyof typeof SopNodeSchemas;
export const SopNodeTypes = Object.keys(SopNodeSchemas) as SopNodeType[];

export { createSOPSchema };
