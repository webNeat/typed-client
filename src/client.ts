import {createEndpoint} from './endpoint'
import {createGroup} from './group'
import {Client, ClientConfig, ClientState} from './types'
import {appendPath} from './utils'

const defaultConfig: ClientConfig = {
  fetch: global.fetch || null,
}

export function createClient(url: string, options: Partial<ClientConfig> = {}): Client {
  if (!defaultConfig.fetch && !options.fetch) {
    throw new Error(`Could not find the global 'fetch' function, please provide your implementation in the options argument`)
  }
  const config = {...defaultConfig, ...options}
  const state: ClientState = {
    url,
    config,
    groups: [],
    endpoints: [],
  }

  const client: Client = {
    group: (path, groupConfig) => {
      const group = createGroup(config, appendPath(url, path), groupConfig)
      state.groups.push(group)
      return group
    },
    get: (path, endpointConfig) => {
      const endpoint = createEndpoint(config, 'GET', appendPath(url, path), endpointConfig) as any
      state.endpoints.push(endpoint)
      return endpoint
    },
    post: (path, endpointConfig) => {
      const endpoint = createEndpoint(config, 'POST', appendPath(url, path), endpointConfig) as any
      state.endpoints.push(endpoint)
      return endpoint
    },
    put: (path, endpointConfig) => {
      const endpoint = createEndpoint(config, 'PUT', appendPath(url, path), endpointConfig) as any
      state.endpoints.push(endpoint)
      return endpoint
    },
    delete: (path, endpointConfig) => {
      const endpoint = createEndpoint(config, 'DELETE', appendPath(url, path), endpointConfig) as any
      state.endpoints.push(endpoint)
      return endpoint
    },
    unmock: () => {
      for (const group of state.groups) {
        group.unmock()
      }
      for (const endpoint of state.endpoints) {
        endpoint.unmock()
      }
    },
  }

  return client
}
