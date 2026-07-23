import Axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { resolveRequestOrigin } from "../core/targetContext.js";

export const AXIOS_INSTANCE = Axios.create();

/**
 * Rewrite absolute TD API URLs so the path after `/api/` uses the sticky
 * request origin (AsyncLocalStorage), falling back to env host:port.
 */
export function rewriteTdApiUrl(
	url: string,
	origin: string = resolveRequestOrigin().origin,
): string {
	const apiIdx = url.indexOf("/api/");
	if (apiIdx >= 0) {
		return `${origin}${url.slice(apiIdx)}`;
	}
	return url;
}

export const customInstance = <T>(
	config: AxiosRequestConfig,
	options?: AxiosRequestConfig,
): Promise<T> => {
	const source = Axios.CancelToken.source();
	const nextConfig: AxiosRequestConfig = {
		...config,
		...options,
		cancelToken: source.token,
	};
	if (typeof nextConfig.url === "string") {
		nextConfig.url = rewriteTdApiUrl(nextConfig.url);
	}
	const promise = AXIOS_INSTANCE(nextConfig).then(({ data }) => data);

	// @ts-expect-error cancel helper used by orval clients
	promise.cancel = () => {
		source.cancel("Query was cancelled");
	};

	return promise;
};

export type ErrorType<E> = AxiosError<E>;

export type BodyType<BodyData> = BodyData;
