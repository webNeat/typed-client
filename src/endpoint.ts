import {BaseEndpointConfig, BaseRequest, BaseResponse, ClientConfig, Endpoint, EndpointState, HTTPMethod, MockHandler} from './types'

export function createEndpoint(clientConfig: ClientConfig, method: HTTPMethod, url: string, config?: BaseEndpointConfig): Endpoint {
  config = config || {}
  let state: EndpointState = {
    clientConfig,
    config: {
      url,
      method,
      ...config,
    },
  }

  const endpoint: Endpoint = (async (req: BaseRequest) => {
    const [newState, res] = await handle(state, req)
    state = newState
    return res
  }) as any
  endpoint.mock = (handler) => {
    state = mock(state, handler)
  }
  endpoint.unmock = () => {
    state = unmock(state)
  }

  return endpoint as Endpoint
}

async function handle(state: EndpointState, req: BaseRequest): Promise<[EndpointState, BaseResponse]> {
  const fetchRequest = createFetchRequest(state, validateRequest(state, req))
  const fetchResponse = await state.clientConfig.fetch(fetchRequest)
  const res = await createResponse(fetchResponse)
  return [state, validateResponse(state, res)]
}

function mock(state: EndpointState, _: MockHandler) {
  return state
}

function unmock(state: EndpointState) {
  return state
}

function validateRequest(state: EndpointState, req: BaseRequest): BaseRequest {
  const schemas = state.config
  return {
    params: schemas.params ? schemas.params.parse(req.params) : req.params,
    query: schemas.query ? schemas.query.parse(req.query) : req.query,
    headers: schemas.headers ? schemas.headers.parse(req.headers) : req.headers,
    body: schemas.body ? schemas.body.parse(req.body) : req.body,
  }
}

function createFetchRequest(state: EndpointState, req: BaseRequest) {
  const {url, method} = state.config
  return new Request(buildUrl(url, req.params || {}, req.query || {}), {
    method,
    headers: {
      ...req.headers,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: req.body && JSON.stringify(req.body),
  })
}

async function createResponse(response: Response): Promise<BaseResponse> {
  const status = response.status
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  const body = await response.json()
  return {status, headers, body}
}

function validateResponse(state: EndpointState, res: BaseResponse): BaseResponse {
  const schemas = state.config.responses
  if (schemas) {
    const schema = schemas[res.status]
    if (!schema) throw `Received response with unknown status '${res.status}'!`
    if (schema.headers) res.headers = schema.headers.parse(res.headers)
    if (schema.body) res.body = schema.body.parse(res.body)
  }
  return res
}

function buildUrl(url: string, params: Record<string, string | number>, query: Record<string, string | number>) {
  const paramsNames = Object.keys(params)
  paramsNames.sort((a, b) => a.length - b.length)
  for (const name of paramsNames) {
    url = url.replaceAll(`:${name}`, params[name] as string)
  }
  const qs = new URLSearchParams(query as Record<string, string>)
  return `${url}?${qs.toString()}`
}
