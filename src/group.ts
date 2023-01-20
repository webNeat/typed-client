import {createEndpoint} from './endpoint'
import {appendPath, mergeConfigs} from './utils'
import {BaseEndpointConfig, ClientConfig, Group, GroupState} from './types'

export function createGroup(clientConfig: ClientConfig, url: string, config?: BaseEndpointConfig): Group {
  config = config || {}
  let state: GroupState = {
    clientConfig,
    config: {url, ...config},
    groups: [],
    endpoints: [],
  }
  return {
    group: (path, groupConfig) => {
      const group = createGroup(clientConfig, appendPath(url, path), mergeConfigs(config, groupConfig))
      state.groups.push(group)
      return group
    },
    get: (path, endpointConfig) => {
      const endpoint = createEndpoint(clientConfig, 'GET', appendPath(url, path), mergeConfigs(config, endpointConfig)) as any
      state.endpoints.push(endpoint)
      return endpoint
    },
    post: (path, endpointConfig) => {
      const endpoint = createEndpoint(clientConfig, 'POST', appendPath(url, path), mergeConfigs(config, endpointConfig)) as any
      state.endpoints.push(endpoint)
      return endpoint
    },
    put: (path, endpointConfig) => {
      const endpoint = createEndpoint(clientConfig, 'PUT', appendPath(url, path), mergeConfigs(config, endpointConfig)) as any
      state.endpoints.push(endpoint)
      return endpoint
    },
    delete: (path, endpointConfig) => {
      const endpoint = createEndpoint(clientConfig, 'DELETE', appendPath(url, path), mergeConfigs(config, endpointConfig)) as any
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
}
