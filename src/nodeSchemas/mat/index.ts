import type { z } from "zod";
import { constant } from "./constant.js";
import { depth } from "./depth.js";
import { glsl } from "./glsl.js";
import { inNode } from "./in.js";
import { line } from "./line.js";
import { nullNode } from "./null.js";
import { out } from "./out.js";
import { pbr } from "./pbr.js";
import { phong } from "./phong.js";
import { pointsprite } from "./pointsprite.js";
import { select } from "./select.js";
import { switchNode } from "./switch.js";
import { createMATSchema } from "./utils.js";
import { wireframe } from "./wireframe.js";

export const MatNodeSchemas: Record<string, z.ZodTypeAny> = {
	constant,
	depth,
	glsl,
	in: inNode,
	line,
	null: nullNode,
	out,
	pbr,
	phong,
	pointsprite,
	select,
	switch: switchNode,
	wireframe,
};

export type MatNodeSchema = z.infer<
	(typeof MatNodeSchemas)[keyof typeof MatNodeSchemas]
>;
export type MatNodeType = keyof typeof MatNodeSchemas;
export const MatNodeTypes = Object.keys(MatNodeSchemas) as MatNodeType[];

export { createMATSchema };
