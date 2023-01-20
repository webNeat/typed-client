import {join} from 'path'
import {z, ZodObject, ZodRawShape} from 'zod'
import {BaseEndpointConfig} from './types'

export function appendPath(url: string, path: string) {
  return join(url, path)
}

export function mergeConfigs(a?: BaseEndpointConfig, b?: BaseEndpointConfig): BaseEndpointConfig | undefined {
  if (!a || !b) return b || a
  return {
    params: a.params && b.params ? mergeSchemas(a.params as any, b.params as any) : b.params || a.params,
    headers: a.headers && b.headers ? mergeSchemas(a.headers as any, b.headers as any) : b.headers || a.headers,
    query: a.query && b.query ? mergeSchemas(a.query as any, b.query as any) : b.query || a.query,
    body: b.body || a.body,
    responses: {...(a.responses || {}), ...(b.responses || {})},
  }
}

function mergeSchemas<A extends ZodRawShape, B extends ZodRawShape>(a: ZodObject<A>, b: ZodObject<B>): ZodObject<A & B> {
  return z.object({...a.shape, ...b.shape}) as any
}
