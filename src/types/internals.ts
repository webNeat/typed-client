import {Endpoint, Group} from './public'
import {BaseEndpointConfig} from './utils/Configs'

export type ClientState = {
  url: string
  config: ClientConfig
  groups: Group[]
  endpoints: Endpoint[]
}
export type ClientConfig = {
  fetch: (req: Request) => Promise<Response>
}

export type GroupState = {
  config: BaseEndpointConfig & {
    url: string
  }
  clientConfig: ClientConfig
  groups: Group[]
  endpoints: Endpoint[]
}

export type EndpointState = {
  config: BaseEndpointConfig & {
    method: HTTPMethod
    url: string
  }
  clientConfig: ClientConfig
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
