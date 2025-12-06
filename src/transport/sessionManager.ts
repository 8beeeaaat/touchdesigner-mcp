import { randomUUID } from "node:crypto";
import type { ILogger } from "../core/logger.js";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import type { SessionConfig } from "./config.js";
import { DEFAULT_SESSION_CONFIG } from "./config.js";

/**
 * Session metadata
 */
export interface Session {
	/**
	 * Unique session identifier (UUID v4)
	 */
	id: string;

	/**
	 * Timestamp when session was created (milliseconds since epoch)
	 */
	createdAt: number;

	/**
	 * Timestamp when session was last accessed (milliseconds since epoch)
	 */
	lastAccessedAt: number;

	/**
	 * Optional metadata associated with the session
	 */
	metadata?: Record<string, unknown>;
}

/**
 * Session manager interface
 */
export interface ISessionManager {
	/**
	 * Create a new session
	 */
	create(metadata?: Record<string, unknown>): string;

	/**
	 * Validate and update session access time
	 */
	validate(sessionId: string): Result<Session, Error>;

	/**
	 * Clean up a session by ID
	 */
	cleanup(sessionId: string): Result<void, Error>;

	/**
	 * List all active sessions
	 */
	list(): Session[];

	/**
	 * Start automatic TTL-based cleanup
	 */
	startTTLCleanup(): void;

	/**
	 * Stop automatic TTL-based cleanup
	 */
	stopTTLCleanup(): void;
}

/**
 * Session Manager
 *
 * Manages client sessions for Streamable HTTP transport.
 * Provides session creation, validation, TTL-based expiration, and automatic cleanup.
 *
 * @example
 * ```typescript
 * const sessionManager = new SessionManager(
 *   { enabled: true, ttl: 60 * 60 * 1000 }, // 1 hour TTL
 *   logger
 * );
 *
 * // Create session
 * const sessionId = sessionManager.create({ clientVersion: '1.0' });
 *
 * // Validate session
 * const result = sessionManager.validate(sessionId);
 * if (result.success) {
 *   console.log('Session valid:', result.data);
 * }
 *
 * // Start automatic cleanup
 * sessionManager.startTTLCleanup();
 *
 * // Stop cleanup when done
 * sessionManager.stopTTLCleanup();
 * ```
 */
export class SessionManager implements ISessionManager {
	private readonly sessions: Map<string, Session> = new Map();
	private readonly config: SessionConfig;
	private readonly logger: ILogger;
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor(config: SessionConfig, logger: ILogger) {
		// Only use defaults for undefined values, don't override explicit undefined
		this.config = {
			cleanupInterval: config.cleanupInterval, // Don't apply default if not specified
			enabled: config.enabled ?? DEFAULT_SESSION_CONFIG.enabled,
			ttl: config.ttl, // Don't apply default TTL if not specified
		};
		this.logger = logger;
	}

	/**
	 * Create a new session with optional metadata
	 *
	 * @param metadata - Optional metadata to associate with the session
	 * @returns Session ID (UUID v4)
	 */
	create(metadata?: Record<string, unknown>): string {
		const sessionId = randomUUID();
		const now = Date.now();

		const session: Session = {
			createdAt: now,
			id: sessionId,
			lastAccessedAt: now,
			metadata,
		};

		this.sessions.set(sessionId, session);

		this.logger.sendLog({
			data: `Session created: ${sessionId}${metadata ? ` (metadata: ${JSON.stringify(metadata)})` : ""}`,
			level: "info",
			logger: "SessionManager",
		});

		return sessionId;
	}

	/**
	 * Validate a session and update its last accessed time
	 *
	 * @param sessionId - Session ID to validate
	 * @returns Result with Session data or Error
	 */
	validate(sessionId: string): Result<Session, Error> {
		const session = this.sessions.get(sessionId);

		if (!session) {
			return createErrorResult(new Error(`Invalid session ID: ${sessionId}`));
		}

		// Check TTL if configured
		if (this.config.ttl) {
			const elapsed = Date.now() - session.lastAccessedAt;
			if (elapsed > this.config.ttl) {
				// Session expired, clean it up
				this.cleanup(sessionId);
				return createErrorResult(
					new Error(
						`Session expired: ${sessionId} (TTL: ${this.config.ttl}ms)`,
					),
				);
			}
		}

		// Update last accessed time
		session.lastAccessedAt = Date.now();

		return createSuccessResult(session);
	}

	/**
	 * Clean up (delete) a session by ID
	 *
	 * @param sessionId - Session ID to clean up
	 * @returns Result indicating success or failure
	 */
	cleanup(sessionId: string): Result<void, Error> {
		const existed = this.sessions.delete(sessionId);

		if (existed) {
			this.logger.sendLog({
				data: `Session cleaned up: ${sessionId}`,
				level: "info",
				logger: "SessionManager",
			});
			return createSuccessResult(undefined);
		}

		return createErrorResult(
			new Error(`Session not found for cleanup: ${sessionId}`),
		);
	}

	/**
	 * List all active sessions
	 *
	 * @returns Array of all active sessions
	 */
	list(): Session[] {
		return Array.from(this.sessions.values());
	}

	/**
	 * Start automatic TTL-based cleanup
	 *
	 * Runs cleanup task at an interval of TTL/2 to remove expired sessions.
	 * Does nothing if TTL is not configured or cleanup is already running.
	 */
	startTTLCleanup(): void {
		// Don't start if TTL not configured or already running
		if (!this.config.ttl || this.cleanupInterval) {
			return;
		}

		const intervalMs = this.config.cleanupInterval || this.config.ttl / 2;

		this.logger.sendLog({
			data: `Starting TTL cleanup (interval: ${intervalMs}ms, TTL: ${this.config.ttl}ms)`,
			level: "info",
			logger: "SessionManager",
		});

		this.cleanupInterval = setInterval(() => {
			this.runCleanupTask();
		}, intervalMs);

		// Don't keep the process alive just for cleanup
		this.cleanupInterval.unref();
	}

	/**
	 * Stop automatic TTL-based cleanup
	 */
	stopTTLCleanup(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;

			this.logger.sendLog({
				data: "Stopped TTL cleanup",
				level: "info",
				logger: "SessionManager",
			});
		}
	}

	/**
	 * Run a single cleanup task to remove expired sessions
	 *
	 * @private
	 */
	private runCleanupTask(): void {
		const now = Date.now();
		const ttl = this.config.ttl;

		if (!ttl) {
			return;
		}

		let cleanedCount = 0;

		for (const [id, session] of this.sessions.entries()) {
			const elapsed = now - session.lastAccessedAt;
			if (elapsed > ttl) {
				this.sessions.delete(id);
				cleanedCount++;

				this.logger.sendLog({
					data: `Session expired and cleaned: ${id} (idle: ${elapsed}ms)`,
					level: "info",
					logger: "SessionManager",
				});
			}
		}

		if (cleanedCount > 0) {
			this.logger.sendLog({
				data: `Cleanup task completed: ${cleanedCount} session(s) removed`,
				level: "info",
				logger: "SessionManager",
			});
		}
	}

	/**
	 * Get number of active sessions
	 *
	 * @returns Number of active sessions
	 */
	getActiveSessionCount(): number {
		return this.sessions.size;
	}

	/**
	 * Clear all sessions
	 *
	 * Useful for testing or emergency cleanup.
	 */
	clearAll(): void {
		const count = this.sessions.size;
		this.sessions.clear();

		this.logger.sendLog({
			data: `All sessions cleared: ${count} session(s) removed`,
			level: "info",
			logger: "SessionManager",
		});
	}
}
