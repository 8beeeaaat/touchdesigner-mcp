import Axios, { type AxiosError, type AxiosRequestConfig } from "axios";

export const AXIOS_INSTANCE = Axios.create();

export const customInstance = <T>(
	config: AxiosRequestConfig,
	options?: AxiosRequestConfig,
): Promise<T> => {
	const source = Axios.CancelToken.source();
	const promise = AXIOS_INSTANCE({
		...config,
		...options,
		cancelToken: source.token,
	}).then(({ data }) => data);

	// @ts-expect-error
	promise.cancel = () => {
		source.cancel("Query was cancelled");
	};

	return promise;
};

export type ErrorType<E> = AxiosError<E>;

export type BodyType<BodyData> = BodyData;
