/**
 * Transport layer module exports
 *
 * This module provides type-safe configuration and validation for MCP transports:
 * - stdio: Standard input/output transport
 * - streamable-http: HTTP-based transport (stateless per protocol revision 2026-07-28)
 */

export type {
	StdioTransportConfig,
	StreamableHttpTransportConfig,
	TransportConfig,
	TransportType,
} from "./config.js";

export {
	DEFAULT_HTTP_CONFIG,
	isStdioTransportConfig,
	isStreamableHttpTransportConfig,
	TransportConfigSchema,
} from "./config.js";
export { ExpressHttpManager } from "./expressHttpManager.js";
export type { ValidationError } from "./validator.js";
export { TransportConfigValidator } from "./validator.js";
