import Axios, { type AxiosError, type AxiosRequestConfig } from "axios";

export const AXIOS_INSTANCE = Axios.create();

/**
 * Where TouchDesigner's WebServer DAT is listening.
 *
 * Read per request rather than captured once: the CLI sets these while
 * parsing its arguments, which happens after this module is imported.
 */
const resolveBaseUrl = (): string => {
	const host = process.env.TD_WEB_SERVER_HOST;
	const port = process.env.TD_WEB_SERVER_PORT;
	if (!host || !port) {
		throw new Error(
			"TouchDesigner connection is not configured: set TD_WEB_SERVER_HOST and TD_WEB_SERVER_PORT, or pass --host and --port.",
		);
	}
	return `${host}:${port}`;
};

export const customInstance = <T>(
	config: AxiosRequestConfig,
	options?: AxiosRequestConfig,
): Promise<T> => {
	const source = Axios.CancelToken.source();
	// Resolved inside the chain so a missing configuration rejects like every
	// other failure here, rather than throwing synchronously out of a function
	// callers await.
	const promise = Promise.resolve()
		.then(() =>
			AXIOS_INSTANCE({
				baseURL: resolveBaseUrl(),
				...config,
				...options,
				cancelToken: source.token,
			}),
		)
		.then(({ data }) => data);

	// @ts-expect-error
	promise.cancel = () => {
		source.cancel("Query was cancelled");
	};

	return promise;
};

export type ErrorType<E> = AxiosError<E>;

export type BodyType<BodyData> = BodyData;
