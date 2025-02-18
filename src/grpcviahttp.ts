import { RpcTransport, RpcOptions, MethodInfo } from '@protobuf-ts/runtime-rpc'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { JsonObject } from '@protobuf-ts/runtime/build/types/json-typings'
import { ElMessage } from 'element-plus'

export type GrtpPromise<I, O> = Promise<AxiosResponse<O, AxiosRequestConfig<I>>>

export function executeGrtp<I extends object, O extends object>(
    callType: string,
    transport: RpcTransport,
    method: MethodInfo<I, O>,
    options: RpcOptions,
    input: I,
): GrtpPromise<I, O> {
    console.info('GRPC:', 'C:', callType, 'T:', transport, 'M:', method, 'O:', options, 'I:', input)

    const urxBase = options.baseUrl as string //目前是这样的
    const apiHttp = method.options['google.api.http'] as JsonObject //目前是这样的

    const reqMethods = ['get', 'post', 'put', 'delete']
    const httpMethod = Object.keys(apiHttp).find((key) => reqMethods.includes(key)) as string
    if (!httpMethod) {
        if (Object.keys(apiHttp).length === 0) {
            const reason = '请求出错-在GRPC里没有找到补充定义的HTTP类型'
            ElMessage.error(reason)
            throw new Error(reason)
        } else {
            const reason = '请求出错-在GRPC里定义非 GET/POST/PUT/DELETE 的HTTP类型'
            ElMessage.error(reason)
            throw new Error(reason)
        }
    }
    let uriPath = apiHttp[httpMethod] as string

    let httpParams: I = undefined
    let httpDataXs: I = undefined
    //假如没有 body 属性，结果将是 undefined，而不会导致运行时错误
    if (apiHttp.body == '*') {
        httpDataXs = input
    } else {
        if (uriPath.includes('{') && uriPath.includes('}')) {
            uriPath = rewritePathParam(uriPath, input)
        } else {
            httpParams = input
        }
    }
    const urx = urxCombine(urxBase, uriPath)

    const axiosConfig: AxiosRequestConfig = {
        method: httpMethod,
        url: urx,
        params: httpParams, //当遇到get请求时-这样直接写上就行-也不用转成查询参数放在后面
        data: httpDataXs,
        headers: options.meta, //这里好像两个数据都允许为空因为没有问题
    }

    return axios.request<O, AxiosResponse<O, AxiosRequestConfig>>(axiosConfig)
}

function rewritePathParam<T extends object>(uriPath: string, input: T): string {
    const params = uriPath.match(/{(\w+)}/g)
    if (params) {
        params.forEach((param) => {
            const paramName = param.slice(1, -1)
            let value = input[paramName]

            if (value === undefined) {
                // 尝试将蛇形命名法转换为小驼峰命名法
                const pnm: string = paramName2camelcase(paramName)
                value = input[pnm]
            }

            if (value === undefined) {
                const reason = `MISSING PARAMETER: ${paramName}`
                ElMessage.error(reason)
                throw new Error(reason)
            }

            uriPath = uriPath.replace(param, encodeURIComponent(value))
        })
    }
    return uriPath
}

export function urxCombine(urb: string, uri: string): string {
    let urx: string
    if (uri.startsWith('/')) {
        urx = urb + uri
    } else {
        urx = urb + '/' + uri
    }
    console.log('urx-combine:', urx)
    return urx
}

function paramName2camelcase(paramName: string): string {
    return paramName.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
}
