export * from "./comp/index.js";
export * from "./tops/index.js";

import type { z } from "zod";
import {
	createNodeBody,
	deleteNodeParams,
	getNodePropertyParams,
	getNodeTypeDefaultParametersQueryParams,
	updateNodeBody,
	updateNodeParams,
} from "../gen/mcp/touchDesignerAPI.zod.js";
import type { NodeFamilyType } from "../gen/models/nodeFamilyType.js";
import { ChopNodeSchemas } from "./chops/index.js";
import { CompNodeSchemas } from "./comp/index.js";
import { TopNodeSchemas } from "./tops/index.js";

export const NodeSchemasByFamily: Record<
	NodeFamilyType,
	Record<string, z.ZodTypeAny>
> = {
	TOP: TopNodeSchemas,
	COMP: CompNodeSchemas,
	CHOP: ChopNodeSchemas,
	SOP: {},
	DAT: {},
	CUSTOM: {},
	MAT: {},
};

// for MCP Server tools
export const CreateTDNodeParams = createNodeBody.shape;
export const DeleteTDNodeParams = deleteNodeParams.shape;
export const GetNodeTypeDefaultParametersQueryParams =
	getNodeTypeDefaultParametersQueryParams.shape;
export const GetTDNodePropertiesParams = getNodePropertyParams.shape;
export const UpdateTDNodePropertiesParams =
	updateNodeBody.merge(updateNodeParams).shape;
