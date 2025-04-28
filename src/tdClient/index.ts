import type { ILogger } from "../core/logger.js";
import { TouchDesignerClient } from "./touchDesignerClient.js";

export interface CreateTouchDesignerClientParams {
	logger: ILogger;
}

export function createTouchDesignerClient(
	params: CreateTouchDesignerClientParams,
) {
	const { logger } = params;

	return new TouchDesignerClient({ logger });
}

export { TouchDesignerClient } from "./touchDesignerClient.js";
