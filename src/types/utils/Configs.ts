import {Equal} from 'expect-type'
import {Is} from 'just-types'
import {ZodArray, ZodObject, ZodString} from 'zod'
import {UrlParams} from './UrlParams'
import {Normalize, Merge} from './Objects'
import {Validator, ValidatorType, ValidatorTypes} from './Validator'

export type BaseEndpointConfig<Url extends string = any> = {
  params?: Validator<UrlParams<Url>>
  headers?: Validator<Record<string, string>>
  query?: Validator<Record<string, string | number>>
  body?: Validator<any>
  responses?: Record<
    number,
    {
      headers?: Validator<Record<string, string>>
      body?: Validator<any>
    }
  >
}

export type AddParams<Config extends BaseEndpointConfig, Url extends string, Params = UrlParams<Url>> = 'params' extends keyof Config
  ? Config
  : {} extends Params
  ? Config
  : Config & {params: Validator<Params>}

type RequestKeys = 'params' | 'headers' | 'query' | 'body'
type Get<T, K, Default = never> = K extends keyof T ? T[K] : Default

export type ExtractRequest<Config extends BaseEndpointConfig> = ValidatorTypes<Pick<Config, RequestKeys>>
export type BaseRequest = ExtractRequest<BaseEndpointConfig>

type DefaultResponse = {
  status: number
  headers: Record<string, string>
  body: unknown
}
export type ExtractResponse<Config extends BaseEndpointConfig, StatusCodes extends keyof Config['responses'] = keyof Config['responses']> = Get<
  Config,
  'responses'
> extends never
  ? DefaultResponse
  : {} extends Config['responses']
  ? DefaultResponse
  : {
      [key in StatusCodes]: {
        status: key
        headers: 'headers' extends keyof Config['responses'][key] ? ValidatorType<Config['responses'][key]['headers']> : Record<string, string>
        body: 'body' extends keyof Config['responses'][key] ? ValidatorType<Config['responses'][key]['body']> : unknown
      }
    }[StatusCodes]

export type BaseResponse = ExtractResponse<BaseEndpointConfig>

export type MergeEndpointConfigs<A extends BaseEndpointConfig, B extends BaseEndpointConfig> = Normalize<{
  params: MergeConfigsField<A, B, 'params'>
  headers: MergeConfigsField<A, B, 'headers'>
  query: MergeConfigsField<A, B, 'query'>
  body: OverrideConfigsField<A, B, 'body'>
  responses: Merge<Get<A, 'responses', {}>, Get<B, 'responses', {}>>
}>

type MergeConfigsField<A, B, Key> = Key extends keyof A & keyof B
  ? Validator<Merge<ValidatorType<A[Key]>, ValidatorType<B[Key]>>>
  : Key extends keyof A
  ? A[Key]
  : Key extends keyof B
  ? B[Key]
  : never

type OverrideConfigsField<A, B, Key> = Key extends keyof B ? B[Key] : Key extends keyof A ? A[Key] : never

// Testing
type Tests = [
  // AddParams
  Is<Equal<AddParams<{}, '/users/:id'>, {params: Validator<{id: string | number}>}>>,
  // ExtractRequest
  Is<Equal<ExtractRequest<{}>, {}>>,
  Is<Equal<ExtractRequest<{headers: ZodObject<{token: ZodString}>}>, {headers: {token: string}}>>,
  Is<Equal<ExtractRequest<{headers: ZodObject<{token: ZodString}>; responses: {200: {body: ZodString}}}>, {headers: {token: string}}>>,
  // ExtractResponse
  Is<Equal<ExtractResponse<{}>, DefaultResponse>>,
  Is<Equal<ExtractResponse<{responses: {}}>, DefaultResponse>>,
  Is<Equal<ExtractResponse<{headers: ZodObject<{token: ZodString}>}>, DefaultResponse>>,
  Is<
    Equal<ExtractResponse<{headers: ZodObject<{token: ZodString}>; responses: {200: {}}}>, {status: 200; headers: Record<string, string>; body: unknown}>
  >,
  Is<Equal<ExtractResponse<{responses: {200: {body: ZodArray<ZodString>}}}>, {status: 200; headers: Record<string, string>; body: string[]}>>,
  // MergeEndpointConfigs
  Is<Equal<MergeEndpointConfigs<{}, {}>, {responses: {}}>>,
  Is<
    Equal<
      MergeEndpointConfigs<
        {params: Validator<{id: number}>; query: Validator<{page: number}>; body: Validator<{message: string}>},
        {params: Validator<{userId: number}>; headers: Validator<{token: string}>; body: Validator<number[]>}
      >,
      {
        params: Validator<{id: number; userId: number}>
        headers: Validator<{token: string}>
        query: Validator<{page: number}>
        body: Validator<number[]>
        responses: {}
      }
    >
  >,
  Is<
    Equal<
      MergeEndpointConfigs<{responses: {400: {body: Validator<{message: string}>}}}, {responses: {200: {body: Validator<{data: {}}>}}}>,
      {responses: {200: {body: Validator<{data: {}}>}; 400: {body: Validator<{message: string}>}}}
    >
  >,
  Is<
    Equal<
      MergeEndpointConfigs<{responses: {400: {body: Validator<{message: string}>}}}, {responses: {400: {headers: Validator<{token: string}>}}}>,
      {responses: {400: {headers: Validator<{token: string}>}}}
    >
  >,
]
