import {Equal} from 'expect-type'
import {Is, Split, Filter, Tail} from 'just-types'

export type UrlParams<Url extends string> = Url extends `${infer _}:${infer __}`
  ? // @ts-expect-error
    Record<UrlParamName<Url>, string | number>
  : {}

type UrlParamName<Url extends string> = Tail<Filter<Split<Url, '/'>, `:${string}`>[number]>

type Tests = [
  Is<Equal<UrlParamName<'/'>, never>>,
  Is<Equal<UrlParamName<'/users'>, never>>,
  Is<Equal<UrlParamName<'/users/:id'>, 'id'>>,
  Is<Equal<UrlParamName<'/users/:id/posts'>, 'id'>>,

  Is<Equal<UrlParams<'/'>, {}>>,
  Is<Equal<UrlParams<'/users'>, {}>>,
  Is<Equal<UrlParams<'/users/:id'>, {id: string | number}>>,
  Is<Equal<UrlParams<'/users/:id/comments'>, {id: string | number}>>,
  Is<Equal<UrlParams<'/users/:userId/comments/:commentId'>, {userId: string | number; commentId: string | number}>>,
  Is<Equal<UrlParams<'/users/:id/comments/:id'>, {id: string | number}>>,
]
