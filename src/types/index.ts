import {AddParams, BaseEndpointConfig, ExtractRequest, ExtractResponse, MergeEndpointConfigs} from './Configs'

export interface Client {
  group: GroupMethod
  get: EndpointMethod
  post: EndpointMethod
  put: EndpointMethod
  delete: EndpointMethod
  unmock(): void
}

export interface Group<Config extends BaseEndpointConfig> {
  group: GroupMethod<Config>
  get: EndpointMethod<Config>
  post: EndpointMethod<Config>
  put: EndpointMethod<Config>
  delete: EndpointMethod<Config>
  unmock(): void
}

export interface Endpoint<
  Config extends BaseEndpointConfig,
  Req = ExtractRequest<Config>,
  Res = ExtractResponse<Config>,
> {
  (req: Req): Promise<Res>
  mock(handler: (req: Req) => Res | Promise<Res>): void
  unmock(): void
}

export type GroupMethod<BaseConfig extends BaseEndpointConfig = {}> = <
  Url extends string,
  Config extends BaseEndpointConfig<Url> = {},
>(
  url: Url,
  config?: Config,
) => Group<MergeEndpointConfigs<BaseConfig, AddParams<Config, Url>>>

export type EndpointMethod<BaseConfig extends BaseEndpointConfig = {}> = <
  Url extends string,
  Config extends BaseEndpointConfig<Url> = {},
>(
  url: Url,
  config?: Config,
) => Endpoint<MergeEndpointConfigs<BaseConfig, AddParams<Config, Url>>>
