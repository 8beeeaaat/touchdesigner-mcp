import { z } from "zod";

/**
 * Transport types supported by the MCP server
 */
export type TransportType = "stdio" | "streamable-http";

/**
 * Session configuration for Streamable HTTP transport
 */
export interface SessionConfig {
	/**
	 * Enable session management (default: true)
	 */
	enabled: boolean;

	/**
	 * Session TTL in milliseconds (default: 1 hour)
	 */
	ttl?: number;

	/**
	 * Interval for session cleanup in milliseconds (default: 5 minutes)
	 */
	cleanupInterval?: number;
}

/**
 * Security configuration for Streamable HTTP transport
 */
export interface SecurityConfig {
	/**
	 * List of allowed origins for CORS (default: ['http://localhost:*', 'http://127.0.0.1:*'])
	 */
	allowedOrigins?: string[];

	/**
	 * List of allowed hosts for DNS rebinding protection (default: ['localhost', '127.0.0.1'])
	 */
	allowedHosts?: string[];

	/**
	 * Enable DNS rebinding protection (default: true)
	 */
	enableDnsRebindingProtection?: boolean;
}

/**
 * Configuration for stdio transport
 */
export interface StdioTransportConfig {
	type: "stdio";
}

/**
 * Configuration for Streamable HTTP transport
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

	/**
	 * Session management configuration
	 */
	sessionConfig?: SessionConfig;

	/**
	 * Security policy configuration
	 */
	securityConfig?: SecurityConfig;
}

/**
 * Union type for all transport configurations
 */
export type TransportConfig =
	| StdioTransportConfig
	| StreamableHttpTransportConfig;

/**
 * Zod schema for SessionConfig validation
 */
const SessionConfigSchema = z
	.object({
		cleanupInterval: z.number().int().positive().optional(),
		enabled: z.boolean(),
		ttl: z.number().int().positive().optional(),
	})
	.strict();

/**
 * Zod schema for SecurityConfig validation
 */
const SecurityConfigSchema = z
	.object({
		allowedHosts: z.array(z.string()).optional(),
		allowedOrigins: z.array(z.string()).optional(),
		enableDnsRebindingProtection: z.boolean().optional(),
	})
	.strict();

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
		securityConfig: SecurityConfigSchema.optional(),
		sessionConfig: SessionConfigSchema.optional(),
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
 * Default values for SessionConfig
 */
export const DEFAULT_SESSION_CONFIG: Required<SessionConfig> = {
	cleanupInterval: 5 * 60 * 1000, // 5 minutes
	enabled: true,
	ttl: 60 * 60 * 1000, // 1 hour
};

/**
 * Default values for SecurityConfig
 */
export const DEFAULT_SECURITY_CONFIG: Required<SecurityConfig> = {
	allowedHosts: ["localhost", "127.0.0.1"],
	allowedOrigins: ["http://localhost:*", "http://127.0.0.1:*"],
	enableDnsRebindingProtection: true,
};

/**
 * Default values for StreamableHttpTransportConfig (excluding required fields)
 */
export const DEFAULT_HTTP_CONFIG = {
	endpoint: "/mcp",
	host: "127.0.0.1",
	securityConfig: DEFAULT_SECURITY_CONFIG,
	sessionConfig: DEFAULT_SESSION_CONFIG,
} as const;
