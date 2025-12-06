/**
 * Transport layer module exports
 *
 * This module provides type-safe configuration and validation for MCP transports:
 * - stdio: Standard input/output transport
 * - streamable-http: HTTP-based transport with SSE streaming
 */

export type {
	SecurityConfig,
	SessionConfig,
	StdioTransportConfig,
	StreamableHttpTransportConfig,
	TransportConfig,
	TransportType,
} from "./config.js";

export {
	DEFAULT_HTTP_CONFIG,
	DEFAULT_SECURITY_CONFIG,
	DEFAULT_SESSION_CONFIG,
	isStdioTransportConfig,
	isStreamableHttpTransportConfig,
	TransportConfigSchema,
} from "./config.js";
export { TransportFactory } from "./factory.js";
export type { ServerStatus } from "./httpServerManager.js";
export { HttpServerManager } from "./httpServerManager.js";
export { HttpTransportManager } from "./httpTransportManager.js";
export type { ISessionManager, Session } from "./sessionManager.js";
export { SessionManager } from "./sessionManager.js";
export type { ValidationError } from "./validator.js";
export { TransportConfigValidator } from "./validator.js";
