import {AddParams, BaseEndpointConfig, ExtractRequest, ExtractResponse, MergeEndpointConfigs} from './Configs'

export interface Client {
  group: GroupMethod
  get: EndpointMethod
  post: EndpointMethod
  put: EndpointMethod
  delete: EndpointMethod
}

export interface Group<Config extends BaseEndpointConfig> {
  group: GroupMethod<Config>
  get: EndpointMethod<Config>
  post: EndpointMethod<Config>
  put: EndpointMethod<Config>
  delete: EndpointMethod<Config>
}

export interface Endpoint<Config extends BaseEndpointConfig> {
  (req: ExtractRequest<Config>): Promise<ExtractResponse<Config>>
  // mock(...)
  // unmock()
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
