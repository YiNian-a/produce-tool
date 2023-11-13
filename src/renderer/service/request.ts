import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const instance = axios.create({
  // baseURL: BASE_URL,
  baseURL: 'https://dev.quantumbeauty.cn',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 响应拦截器
axios.interceptors.response.use(
  (res) => res.data, // 拦截到响应对象，将响应对象的 data 属性返回给调用的地方
  (err) => Promise.reject(err),
);

// request interception
instance.interceptors.request.use(
  (request) => {
    return request;
  },
  (error) => Promise.reject(error),
);
export const request = <T>(reqConfig: AxiosRequestConfig): Promise<T> => {
  return instance.request<T, T>(reqConfig);
};
export type { AxiosInstance, AxiosResponse };
