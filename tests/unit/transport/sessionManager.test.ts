import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ILogger } from "../../../src/core/logger.js";
import type { SessionConfig } from "../../../src/transport/config.js";
import { SessionManager } from "../../../src/transport/sessionManager.js";

describe("SessionManager", () => {
	let mockLogger: ILogger;
	let sessionManager: SessionManager;

	beforeEach(() => {
		// Create mock logger
		mockLogger = {
			sendLog: vi.fn(),
		};
	});

	afterEach(() => {
		// Clean up timers
		if (sessionManager) {
			sessionManager.stopTTLCleanup();
		}
		vi.useRealTimers();
	});

	describe("session creation", () => {
		test("should create session with UUID format", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
			expect(sessionId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});

		test("should create session without metadata", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			expect(sessionId).toBeDefined();
			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					level: "info",
					logger: "SessionManager",
				}),
			);
		});

		test("should create session with metadata", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const metadata = { clientVersion: "1.0", userAgent: "test" };
			const sessionId = sessionManager.create(metadata);

			expect(sessionId).toBeDefined();

			const result = sessionManager.validate(sessionId);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.metadata).toEqual(metadata);
			}
		});

		test("should create unique session IDs", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const id1 = sessionManager.create();
			const id2 = sessionManager.create();
			const id3 = sessionManager.create();

			expect(id1).not.toBe(id2);
			expect(id2).not.toBe(id3);
			expect(id1).not.toBe(id3);
		});

		test("should log session creation", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			expect(mockLogger.sendLog).toHaveBeenCalledWith({
				data: `Session created: ${sessionId}`,
				level: "info",
				logger: "SessionManager",
			});
		});
	});

	describe("session validation", () => {
		test("should validate existing session", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();
			const result = sessionManager.validate(sessionId);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(sessionId);
				expect(result.data.createdAt).toBeTypeOf("number");
				expect(result.data.lastAccessedAt).toBeTypeOf("number");
			}
		});

		test("should reject invalid session ID", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const result = sessionManager.validate("invalid-session-id");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("Invalid session ID");
			}
		});

		test("should update last accessed time on validation", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			// Get initial access time
			const result1 = sessionManager.validate(sessionId);
			expect(result1.success).toBe(true);
			const initialAccessTime = result1.success
				? result1.data.lastAccessedAt
				: 0;

			// Wait a bit
			vi.useFakeTimers();
			vi.advanceTimersByTime(100);

			// Validate again
			const result2 = sessionManager.validate(sessionId);
			expect(result2.success).toBe(true);
			const updatedAccessTime = result2.success
				? result2.data.lastAccessedAt
				: 0;

			expect(updatedAccessTime).toBeGreaterThan(initialAccessTime);
		});
	});

	describe("TTL-based expiration", () => {
		test("should expire session after TTL", () => {
			vi.useFakeTimers();

			const config: SessionConfig = {
				enabled: true,
				ttl: 1000, // 1 second
			};
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			// Session should be valid initially
			const result1 = sessionManager.validate(sessionId);
			expect(result1.success).toBe(true);

			// Advance time beyond TTL
			vi.advanceTimersByTime(1001);

			// Session should be expired
			const result2 = sessionManager.validate(sessionId);
			expect(result2.success).toBe(false);
			if (!result2.success) {
				expect(result2.error.message).toContain("Session expired");
			}
		});

		test("should not expire session before TTL", () => {
			vi.useFakeTimers();

			const config: SessionConfig = {
				enabled: true,
				ttl: 1000,
			};
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			// Advance time but not beyond TTL
			vi.advanceTimersByTime(999);

			// Session should still be valid
			const result = sessionManager.validate(sessionId);
			expect(result.success).toBe(true);
		});

		test("should reset TTL on access", () => {
			vi.useFakeTimers();

			const config: SessionConfig = {
				enabled: true,
				ttl: 1000,
			};
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			// Advance time close to TTL
			vi.advanceTimersByTime(900);

			// Access session (resets TTL)
			const result1 = sessionManager.validate(sessionId);
			expect(result1.success).toBe(true);

			// Advance another 900ms (total 1800ms from creation, but only 900ms from last access)
			vi.advanceTimersByTime(900);

			// Session should still be valid (TTL reset on access)
			const result2 = sessionManager.validate(sessionId);
			expect(result2.success).toBe(true);
		});

		test("should work without TTL configured", () => {
			const config: SessionConfig = {
				enabled: true,
				// No TTL
			};
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			// Session should be valid regardless of time
			const result = sessionManager.validate(sessionId);
			expect(result.success).toBe(true);
		});
	});

	describe("session cleanup", () => {
		test("should clean up existing session", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			const result = sessionManager.cleanup(sessionId);

			expect(result.success).toBe(true);
			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.stringContaining(`Session cleaned up: ${sessionId}`),
					level: "info",
				}),
			);
		});

		test("should fail to clean up non-existent session", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const result = sessionManager.cleanup("non-existent-id");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain("Session not found");
			}
		});

		test("should remove session from list after cleanup", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			expect(sessionManager.list()).toHaveLength(1);

			sessionManager.cleanup(sessionId);

			expect(sessionManager.list()).toHaveLength(0);
		});
	});

	describe("session listing", () => {
		test("should list all active sessions", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const id1 = sessionManager.create();
			const id2 = sessionManager.create();
			const id3 = sessionManager.create();

			const sessions = sessionManager.list();

			expect(sessions).toHaveLength(3);
			expect(sessions.map((s) => s.id)).toContain(id1);
			expect(sessions.map((s) => s.id)).toContain(id2);
			expect(sessions.map((s) => s.id)).toContain(id3);
		});

		test("should return empty array when no sessions", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const sessions = sessionManager.list();

			expect(sessions).toEqual([]);
		});

		test("should not include cleaned up sessions", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const id1 = sessionManager.create();
			const id2 = sessionManager.create();

			sessionManager.cleanup(id1);

			const sessions = sessionManager.list();

			expect(sessions).toHaveLength(1);
			expect(sessions[0]?.id).toBe(id2);
		});
	});

	describe("automatic TTL cleanup", () => {
		test("should start cleanup interval", () => {
			vi.useFakeTimers();

			const config: SessionConfig = {
				cleanupInterval: 500,
				enabled: true,
				ttl: 1000,
			};
			sessionManager = new SessionManager(config, mockLogger);

			sessionManager.startTTLCleanup();

			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.stringContaining("Starting TTL cleanup"),
					level: "info",
				}),
			);
		});

		test("should clean up expired sessions automatically", () => {
			vi.useFakeTimers();

			const config: SessionConfig = {
				cleanupInterval: 500,
				enabled: true,
				ttl: 1000,
			};
			sessionManager = new SessionManager(config, mockLogger);

			// Create sessions
			sessionManager.create();
			sessionManager.create();

			expect(sessionManager.list()).toHaveLength(2);

			// Start cleanup
			sessionManager.startTTLCleanup();

			// Advance time to expire sessions
			vi.advanceTimersByTime(1001);

			// Trigger cleanup interval
			vi.advanceTimersByTime(500);

			// Sessions should be cleaned up
			expect(sessionManager.list()).toHaveLength(0);
		});

		test("should not start cleanup if already running", () => {
			vi.useFakeTimers();

			const config: SessionConfig = {
				cleanupInterval: 500,
				enabled: true,
				ttl: 1000,
			};
			sessionManager = new SessionManager(config, mockLogger);

			sessionManager.startTTLCleanup();
			const firstCallCount = (mockLogger.sendLog as ReturnType<typeof vi.fn>)
				.mock.calls.length;

			sessionManager.startTTLCleanup();
			const secondCallCount = (mockLogger.sendLog as ReturnType<typeof vi.fn>)
				.mock.calls.length;

			// Should not log again
			expect(secondCallCount).toBe(firstCallCount);
		});

		test("should not start cleanup if TTL not configured", () => {
			const config: SessionConfig = {
				enabled: true,
				// No TTL
			};
			sessionManager = new SessionManager(config, mockLogger);

			sessionManager.startTTLCleanup();

			// Should not log cleanup start
			expect(mockLogger.sendLog).not.toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.stringContaining("Starting TTL cleanup"),
				}),
			);
		});

		test("should stop cleanup interval", () => {
			vi.useFakeTimers();

			const config: SessionConfig = {
				cleanupInterval: 500,
				enabled: true,
				ttl: 1000,
			};
			sessionManager = new SessionManager(config, mockLogger);

			sessionManager.startTTLCleanup();
			sessionManager.stopTTLCleanup();

			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: "Stopped TTL cleanup",
					level: "info",
				}),
			);
		});

		test("should not clean up sessions after stopping cleanup", () => {
			vi.useFakeTimers();

			const config: SessionConfig = {
				cleanupInterval: 500,
				enabled: true,
				ttl: 1000,
			};
			sessionManager = new SessionManager(config, mockLogger);

			sessionManager.create();
			sessionManager.startTTLCleanup();
			sessionManager.stopTTLCleanup();

			// Advance time
			vi.advanceTimersByTime(2000);

			// Session should still exist (cleanup stopped)
			expect(sessionManager.list()).toHaveLength(1);
		});
	});

	describe("concurrent access", () => {
		test("should handle multiple concurrent session creations", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const ids = Array.from({ length: 100 }, () => sessionManager.create());

			// All IDs should be unique
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(100);

			// All sessions should be valid
			expect(sessionManager.list()).toHaveLength(100);
		});

		test("should handle concurrent validations", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const sessionId = sessionManager.create();

			// Validate concurrently
			const results = Array.from({ length: 10 }, () =>
				sessionManager.validate(sessionId),
			);

			// All validations should succeed
			results.forEach((result) => {
				expect(result.success).toBe(true);
			});
		});

		test("should handle concurrent cleanup operations", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			const id1 = sessionManager.create();
			const id2 = sessionManager.create();

			// Clean up concurrently
			const result1 = sessionManager.cleanup(id1);
			const result2 = sessionManager.cleanup(id2);

			expect(result1.success).toBe(true);
			expect(result2.success).toBe(true);
			expect(sessionManager.list()).toHaveLength(0);
		});
	});

	describe("utility methods", () => {
		test("should get active session count", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			expect(sessionManager.getActiveSessionCount()).toBe(0);

			sessionManager.create();
			sessionManager.create();

			expect(sessionManager.getActiveSessionCount()).toBe(2);
		});

		test("should clear all sessions", () => {
			const config: SessionConfig = { enabled: true };
			sessionManager = new SessionManager(config, mockLogger);

			sessionManager.create();
			sessionManager.create();
			sessionManager.create();

			expect(sessionManager.getActiveSessionCount()).toBe(3);

			sessionManager.clearAll();

			expect(sessionManager.getActiveSessionCount()).toBe(0);
			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: "All sessions cleared: 3 session(s) removed",
					level: "info",
				}),
			);
		});
	});

	describe("configuration defaults", () => {
		test("should use default cleanup interval if not specified", () => {
			vi.useFakeTimers();

			const config: SessionConfig = {
				enabled: true,
				ttl: 1000,
				// No cleanupInterval specified
			};
			sessionManager = new SessionManager(config, mockLogger);

			sessionManager.startTTLCleanup();

			// Default cleanup interval should be TTL/2 = 500ms
			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.stringContaining("interval: 500ms"),
				}),
			);
		});

		test("should use custom cleanup interval if specified", () => {
			vi.useFakeTimers();

			const config: SessionConfig = {
				cleanupInterval: 250,
				enabled: true,
				ttl: 1000,
			};
			sessionManager = new SessionManager(config, mockLogger);

			sessionManager.startTTLCleanup();

			expect(mockLogger.sendLog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.stringContaining("interval: 250ms"),
				}),
			);
		});
	});
});
