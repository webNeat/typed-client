import {AddParams, BaseEndpointConfig, BaseRequest, BaseResponse, ExtractRequest, ExtractResponse, MergeEndpointConfigs} from './utils/Configs'

export interface Client {
  group: GroupMethod
  get: EndpointMethod
  post: EndpointMethod
  put: EndpointMethod
  delete: EndpointMethod
  unmock(): void
}

export interface Group<Config extends BaseEndpointConfig = BaseEndpointConfig> {
  group: GroupMethod<Config>
  get: EndpointMethod<Config>
  post: EndpointMethod<Config>
  put: EndpointMethod<Config>
  delete: EndpointMethod<Config>
  unmock(): void
}

export interface Endpoint<Config extends BaseEndpointConfig = BaseEndpointConfig, Req = ExtractRequest<Config>, Res = ExtractResponse<Config>> {
  (req: Req): Promise<Res>
  mock(handler: MockHandler<Req, Res>): void
  unmock(): void
}

export type MockHandler<Req = BaseRequest, Res = BaseResponse> = (req: Req) => Res | Promise<Res>

export type GroupMethod<BaseConfig extends BaseEndpointConfig = {}> = <Url extends string, Config extends BaseEndpointConfig<Url> = {}>(
  url: Url,
  config?: Config,
) => GroupReturn<BaseConfig, Url, Config>

export type GroupReturn<BaseConfig extends BaseEndpointConfig, Url extends string, Config extends BaseEndpointConfig> = Group<
  MergeEndpointConfigs<BaseConfig, AddParams<Config, Url>>
>

export type EndpointMethod<BaseConfig extends BaseEndpointConfig = {}> = <Url extends string, Config extends BaseEndpointConfig<Url> = {}>(
  url: Url,
  config?: Config,
) => EndpointReturn<BaseConfig, Url, Config>

export type EndpointReturn<BaseConfig extends BaseEndpointConfig, Url extends string, Config extends BaseEndpointConfig> = Endpoint<
  MergeEndpointConfigs<BaseConfig, AddParams<Config, Url>>
>
