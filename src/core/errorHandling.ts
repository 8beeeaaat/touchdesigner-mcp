import type { ToolNames } from "../features/tools/index.js";
import type { ILogger } from "./logger.js";

/**
 * Standard API error response structure compatible with MCP SDK
 */
interface ErrorResponse {
	[key: string]: unknown;
	isError: true;
	content: Array<{
		type: "text";
		text: string;
	}>;
}

/**
 * Handles API errors consistently across the application
 */
export function handleToolError(
	error: unknown,
	logger: ILogger,
	toolName: ToolNames,
	referenceComment?: string,
): ErrorResponse {
	const formattedError =
		error instanceof Error
			? error
			: new Error(error === null ? "Null error received" : String(error));

	logger.error(toolName, formattedError);

	const errorMessage = `${toolName}: ${formattedError}${referenceComment ? `. ${referenceComment}` : ""}`;

	return {
		isError: true,
		content: [
			{
				type: "text" as const,
				text: errorMessage,
			},
		],
	};
}
