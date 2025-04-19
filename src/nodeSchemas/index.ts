export * from "./comp/index.js";
export * from "./dat/index.js";
export * from "./mat/index.js";
export * from "./sops/index.js";
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
import { DatNodeSchemas } from "./dat/index.js";
import { MatNodeSchemas } from "./mat/index.js";
import { SopNodeSchemas } from "./sops/index.js";
import { TopNodeSchemas } from "./tops/index.js";

export const NodeSchemasByFamily: Record<
	NodeFamilyType,
	Record<string, z.ZodTypeAny>
> = {
	TOP: TopNodeSchemas,
	COMP: CompNodeSchemas,
	CHOP: ChopNodeSchemas,
	SOP: SopNodeSchemas,
	DAT: DatNodeSchemas,
	CUSTOM: {},
	MAT: MatNodeSchemas,
};

// for MCP Server tools
export const CreateTDNodeParams = createNodeBody.shape;
export const DeleteTDNodeParams = deleteNodeParams.shape;
export const GetNodeTypeDefaultParametersQueryParams =
	getNodeTypeDefaultParametersQueryParams.shape;
export const GetTDNodePropertiesParams = getNodePropertyParams.shape;
export const UpdateTDNodePropertiesParams =
	updateNodeBody.merge(updateNodeParams).shape;
