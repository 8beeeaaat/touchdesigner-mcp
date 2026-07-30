import { z } from "zod";

/**
 * Transport types supported by the MCP server
 */
export type TransportType = "stdio" | "streamable-http";

/**
 * Configuration for stdio transport
 */
export interface StdioTransportConfig {
	type: "stdio";
}

/**
 * Configuration for Streamable HTTP transport
 *
 * Protocol revision 2026-07-28 removed protocol-level sessions and the
 * `Mcp-Session-Id` header, so the transport is stateless: there is no session
 * configuration anymore. Each request is served by a fresh server instance.
 */
export interface StreamableHttpTransportConfig {
	type: "streamable-http";

	/**
	 * Port to bind the HTTP server to
	 */
	port: number;

	/**
	 * Host address to bind the HTTP server to (default: '127.0.0.1')
	 */
	host: string;

	/**
	 * MCP endpoint path (default: '/mcp')
	 */
	endpoint: string;
}

/**
 * Union type for all transport configurations
 */
export type TransportConfig =
	| StdioTransportConfig
	| StreamableHttpTransportConfig;

/**
 * Zod schema for StdioTransportConfig validation
 */
const StdioTransportConfigSchema = z
	.object({
		type: z.literal("stdio"),
	})
	.strict();

/**
 * Zod schema for StreamableHttpTransportConfig validation
 */
const StreamableHttpTransportConfigSchema = z
	.object({
		endpoint: z
			.string()
			.min(1, "Endpoint cannot be empty")
			.regex(/^\//, "Endpoint must start with /"),
		host: z.string().min(1, "Host cannot be empty"),
		port: z
			.number()
			.int()
			.positive()
			.min(1)
			.max(65535, "Port must be between 1 and 65535"),
		type: z.literal("streamable-http"),
	})
	.strict();

/**
 * Zod schema for TransportConfig validation (discriminated union)
 */
export const TransportConfigSchema = z.discriminatedUnion("type", [
	StdioTransportConfigSchema,
	StreamableHttpTransportConfigSchema,
]);

/**
 * Type guard to check if config is StdioTransportConfig
 */
export function isStdioTransportConfig(
	config: TransportConfig,
): config is StdioTransportConfig {
	return config.type === "stdio";
}

/**
 * Type guard to check if config is StreamableHttpTransportConfig
 */
export function isStreamableHttpTransportConfig(
	config: TransportConfig,
): config is StreamableHttpTransportConfig {
	return config.type === "streamable-http";
}

/**
 * Default values for StreamableHttpTransportConfig (excluding required fields)
 */
export const DEFAULT_HTTP_CONFIG = {
	endpoint: "/mcp",
	host: "127.0.0.1",
} as const;
