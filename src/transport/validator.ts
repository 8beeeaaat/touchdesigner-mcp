import { ZodError } from "zod";
import type { Result } from "../core/result.js";
import { createErrorResult, createSuccessResult } from "../core/result.js";
import type { TransportConfig } from "./config.js";
import { TransportConfigSchema } from "./config.js";

/**
 * Validation error details
 */
export interface ValidationError {
	field: string;
	message: string;
}

/**
 * Transport configuration validator using Zod schemas
 */
export class TransportConfigValidator {
	/**
	 * Validate a transport configuration
	 *
	 * @param config - The configuration to validate
	 * @returns Result with validated config or validation errors
	 */
	static validate(config: unknown): Result<TransportConfig, Error> {
		try {
			const validatedConfig = TransportConfigSchema.parse(config);
			return createSuccessResult(validatedConfig);
		} catch (error) {
			if (error instanceof ZodError) {
				const validationErrors =
					TransportConfigValidator.formatZodErrors(error);
				const errorMessage =
					TransportConfigValidator.buildErrorMessage(validationErrors);
				return createErrorResult(new Error(errorMessage));
			}

			// Unexpected error
			const err = error instanceof Error ? error : new Error(String(error));
			return createErrorResult(
				new Error(`Transport configuration validation failed: ${err.message}`),
			);
		}
	}

	/**
	 * Format Zod validation errors into structured ValidationError objects
	 *
	 * @param zodError - The Zod validation error
	 * @returns Array of structured validation errors
	 */
	private static formatZodErrors(zodError: ZodError): ValidationError[] {
		return zodError.issues.map((err) => ({
			field: err.path.join("."),
			message: err.message,
		}));
	}

	/**
	 * Build a comprehensive error message from validation errors
	 *
	 * @param errors - Array of validation errors
	 * @returns Formatted error message
	 */
	private static buildErrorMessage(errors: ValidationError[]): string {
		const errorLines = errors.map((err) => {
			if (err.field) {
				return `  - ${err.field}: ${err.message}`;
			}
			return `  - ${err.message}`;
		});

		return `Transport configuration validation failed:\n${errorLines.join("\n")}`;
	}

	/**
	 * Validate and merge with defaults for HTTP transport
	 * This is a convenience method for applying default values after validation
	 *
	 * @param config - The configuration to validate
	 * @returns Result with validated and merged config
	 */
	static validateAndMergeDefaults(
		config: unknown,
	): Result<TransportConfig, Error> {
		const validationResult = TransportConfigValidator.validate(config);

		if (!validationResult.success) {
			return validationResult;
		}

		// No merging needed for stdio
		if (validationResult.data.type === "stdio") {
			return validationResult;
		}

		// Merge defaults for HTTP transport
		// Note: Defaults are already defined in config.ts
		// This method is here for future extensibility if runtime merging is needed
		return validationResult;
	}
}
