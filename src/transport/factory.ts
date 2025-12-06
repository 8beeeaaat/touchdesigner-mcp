import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import type {
	StdioTransportConfig,
	StreamableHttpTransportConfig,
	TransportConfig,
} from "./config.js";
import { isStreamableHttpTransportConfig } from "./config.js";
import { TransportConfigValidator } from "./validator.js";

/**
 * Factory for creating MCP transport instances based on configuration
 *
 * This factory implements the Factory pattern to encapsulate transport creation logic.
 * It validates configuration and creates the appropriate transport type (stdio or HTTP).
 */
export class TransportFactory {
	/**
	 * Create a transport instance from configuration
	 *
	 * @param config - Transport configuration (stdio or streamable-http)
	 * @returns Result with Transport instance or Error
	 *
	 * @example
	 * ```typescript
	 * // Create stdio transport
	 * const stdioResult = TransportFactory.create({ type: 'stdio' });
	 *
	 * // Create HTTP transport
	 * const httpResult = TransportFactory.create({
	 *   type: 'streamable-http',
	 *   port: 3000,
	 *   host: '127.0.0.1',
	 *   endpoint: '/mcp'
	 * });
	 * ```
	 */
	static create(config: TransportConfig): Result<Transport, Error> {
		// Validate configuration first
		const validationResult = TransportConfigValidator.validate(config);
		if (!validationResult.success) {
			return validationResult;
		}

		const validatedConfig = validationResult.data;

		// Dispatch to appropriate factory method based on type
		if (isStreamableHttpTransportConfig(validatedConfig)) {
			return TransportFactory.createStreamableHttp(validatedConfig);
		}

		return TransportFactory.createStdio(validatedConfig);
	}

	/**
	 * Create a stdio transport instance
	 *
	 * @param _config - Stdio transport configuration (unused, kept for API consistency)
	 * @returns Result with StdioServerTransport instance
	 */
	private static createStdio(
		_config: StdioTransportConfig,
	): Result<Transport, Error> {
		try {
			const transport = new StdioServerTransport();
			return createSuccessResult(transport);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(
				new Error(`Failed to create stdio transport: ${err.message}`),
			);
		}
	}

	/**
	 * Create a streamable HTTP transport instance
	 *
	 * Note: This is a placeholder implementation. Full HTTP transport integration
	 * will be completed in Phase 6 after HttpServerManager and SessionManager are implemented.
	 *
	 * @param _config - Streamable HTTP transport configuration
	 * @returns Error result indicating HTTP transport is not yet fully implemented
	 */
	private static createStreamableHttp(
		_config: StreamableHttpTransportConfig,
	): Result<Transport, Error> {
		// TODO: Phase 6 - Implement full HTTP transport creation
		// This will require:
		// 1. HttpServerManager instance
		// 2. SessionManager instance
		// 3. SecurityPolicy instance
		// 4. StreamableHTTPServerTransport configuration
		return createErrorResult(
			new Error(
				"Streamable HTTP transport not yet implemented. This will be completed in Phase 6.",
			),
		);
	}
}
