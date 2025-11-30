/**
 * Result type pattern for handling operation results
 * Success case contains data, failure case contains error
 */
export type Result<T, E = Error> =
	| { success: true; data: T }
	| { success: false; error: E };

/**
 * Creates a success result with the provided data
 */
export function createSuccessResult<T>(data: T): { success: true; data: T } {
	return { data, success: true };
}

/**
 * Creates an error result with the provided error
 */
export function createErrorResult<E = Error>(
	error: E,
): { success: false; error: E } {
	return { error, success: false };
}
