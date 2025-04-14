import type { NodeFamilyType } from "src/gen/models/nodeFamilyType.js";
import type { z } from "zod";
import {
	createNodeBody,
	deleteNodeParams,
	getNodePropertyParams,
	getNodeTypeDefaultParametersQueryParams,
	updateNodeBody,
	updateNodeParams,
} from "../../gen/mcp/touchDesignerAPI.zod.js";
import { TopNodeSchemas } from "../index.js";

export const NodeSchemasByFamily: Record<
	NodeFamilyType,
	Record<string, z.ZodTypeAny>
> = {
	TOP: TopNodeSchemas,
	COMP: {},
	CHOP: {},
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
