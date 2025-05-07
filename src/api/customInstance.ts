import Axios, { type AxiosError, type AxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.TD_WEB_SERVER_URL;
export const AXIOS_INSTANCE = Axios.create(
	API_BASE_URL ? { baseURL: API_BASE_URL } : {},
);

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

	// @ts-ignore
	promise.cancel = () => {
		source.cancel("Query was cancelled");
	};

	return promise;
};

export type ErrorType<E> = AxiosError<E>;

export type BodyType<BodyData> = BodyData;
