import type { SecurityConfig } from "./config.js";
import { DEFAULT_SECURITY_CONFIG } from "./config.js";

/**
 * Security policy interface
 */
export interface ISecurityPolicy {
	/**
	 * Validate request origin against allowed origins
	 */
	validateOrigin(origin: string | undefined): boolean;

	/**
	 * Validate session header format
	 */
	validateSessionHeader(sessionId: string | undefined): boolean;

	/**
	 * Validate Host header for DNS rebinding protection
	 */
	validateHostHeader(host: string | undefined): boolean;

	/**
	 * Apply security headers to response headers
	 */
	applySecurityHeaders(headers: Record<string, string>): Record<string, string>;
}

/**
 * Security Policy
 *
 * Implements security policies for Streamable HTTP transport including:
 * - CORS origin validation with wildcard support
 * - DNS rebinding protection via Host header validation
 * - Session ID format validation (UUID v4)
 * - Security header application (HSTS, CSP, etc.)
 *
 * @example
 * ```typescript
 * const policy = new SecurityPolicy({
 *   allowedOrigins: ['http://localhost:*', 'http://127.0.0.1:*'],
 *   allowedHosts: ['localhost', '127.0.0.1'],
 *   enableDnsRebindingProtection: true
 * });
 *
 * // Validate origin
 * if (!policy.validateOrigin(req.headers.origin)) {
 *   res.writeHead(403);
 *   res.end('Forbidden');
 *   return;
 * }
 *
 * // Apply security headers
 * const headers = policy.applySecurityHeaders({
 *   'Content-Type': 'application/json'
 * });
 * ```
 */
export class SecurityPolicy implements ISecurityPolicy {
	private readonly config: Required<SecurityConfig>;

	constructor(config?: SecurityConfig) {
		// Merge with defaults
		this.config = {
			...DEFAULT_SECURITY_CONFIG,
			...config,
		};
	}

	/**
	 * Validate request origin against allowed origins
	 *
	 * Supports wildcard matching (e.g., "http://localhost:*" matches any port).
	 *
	 * @param origin - Origin header value from request
	 * @returns true if origin is allowed, false otherwise
	 */
	validateOrigin(origin: string | undefined): boolean {
		// If no allowed origins configured, allow all
		if (
			!this.config.allowedOrigins ||
			this.config.allowedOrigins.length === 0
		) {
			return true;
		}

		// Origin header is required when restriction is enabled
		if (!origin) {
			return false;
		}

		// Check against allowed origins with wildcard support
		return this.config.allowedOrigins.some((allowed) => {
			// Support wildcard matching for ports: "http://localhost:*"
			if (allowed.includes("*")) {
				const pattern = allowed.replace("*", "");
				return origin.startsWith(pattern);
			}

			// Exact match
			return origin === allowed;
		});
	}

	/**
	 * Validate session header format (UUID v4)
	 *
	 * @param sessionId - Session ID from Mcp-Session-Id header
	 * @returns true if valid UUID v4 format, false otherwise
	 */
	validateSessionHeader(sessionId: string | undefined): boolean {
		if (!sessionId) {
			return false;
		}

		// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
		// where y is one of [8, 9, a, b]
		const uuidV4Regex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuidV4Regex.test(sessionId);
	}

	/**
	 * Validate Host header for DNS rebinding protection
	 *
	 * Protects against DNS rebinding attacks by ensuring the Host header
	 * matches one of the allowed hosts.
	 *
	 * @param host - Host header value from request
	 * @returns true if host is allowed, false otherwise
	 */
	validateHostHeader(host: string | undefined): boolean {
		// Skip validation if DNS rebinding protection is disabled
		if (!this.config.enableDnsRebindingProtection) {
			return true;
		}

		// Host header is required when protection is enabled
		if (!host) {
			return false;
		}

		// Extract hostname without port (e.g., "localhost:3000" -> "localhost")
		const hostname = host.split(":")[0];

		// Check against allowed hosts
		return this.config.allowedHosts.includes(hostname);
	}

	/**
	 * Apply security headers to response headers
	 *
	 * Adds common security headers:
	 * - X-Content-Type-Options: nosniff
	 * - X-Frame-Options: DENY
	 * - X-XSS-Protection: 1; mode=block
	 * - Content-Security-Policy: default-src 'none'
	 *
	 * @param headers - Existing response headers
	 * @returns Headers with security headers applied
	 */
	applySecurityHeaders(
		headers: Record<string, string>,
	): Record<string, string> {
		return {
			...headers,
			// Restrict resource loading (MCP server doesn't need to load external resources)
			"Content-Security-Policy": "default-src 'none'",
			// Prevent MIME type sniffing
			"X-Content-Type-Options": "nosniff",
			// Prevent clickjacking
			"X-Frame-Options": "DENY",
			// Enable XSS protection in older browsers
			"X-XSS-Protection": "1; mode=block",
		};
	}

	/**
	 * Get CORS headers for preflight response
	 *
	 * Returns appropriate Access-Control-* headers for OPTIONS requests.
	 *
	 * @param origin - Request origin
	 * @returns CORS headers object
	 */
	getCorsHeaders(origin: string | undefined): Record<string, string> {
		const headers: Record<string, string> = {};

		// Only add CORS headers if origin is valid
		if (origin && this.validateOrigin(origin)) {
			headers["Access-Control-Allow-Origin"] = origin;
			headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS";
			headers["Access-Control-Allow-Headers"] = "Content-Type, Mcp-Session-Id";
			headers["Access-Control-Max-Age"] = "86400"; // 24 hours
		}

		return headers;
	}

	/**
	 * Get configuration
	 *
	 * @returns Current security configuration
	 */
	getConfig(): Required<SecurityConfig> {
		return { ...this.config };
	}
}
