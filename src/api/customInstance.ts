import Axios, { type AxiosError, type AxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:9981";
export const AXIOS_INSTANCE = Axios.create({
	baseURL: API_BASE_URL,
});

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

export type ErrorType<e> = AxiosError<e>;

export type BodyType<BodyData> = BodyData;
