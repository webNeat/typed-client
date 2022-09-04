import {z} from 'zod'
import {expectTypeOf} from 'expect-type'
import {client} from '.'

describe('Type inference', () => {
  const User = z.object({
    id: z.number(),
    email: z.string(),
  })
  const LoginCredentials = z.object({
    email: z.string(),
    password: z.string(),
  })
  const Post = z.object({
    id: z.number(),
    title: z.string(),
    content: z.string(),
  })

  type AccessDeniedRes = {status: 401; headers: Record<string, string>; body: unknown}
  type NotFoundRes = {status: 404; headers: Record<string, string>; body: unknown}
  type ServerErrRes = {status: 500; headers: Record<string, string>; body: unknown}

  const api = client('demo.test')

  const login = api.post('/auth', {
    body: LoginCredentials,
    responses: {
      200: {body: z.object({token: z.string()})},
      401: {},
    },
  })

  const authenticated = api.group('/', {
    headers: z.object({token: z.string()}),
    responses: {
      500: {},
    },
  })
  const user = authenticated.group('/users/:userId', {
    params: z.object({
      userId: z.number(),
    }),
    responses: {
      404: {},
    },
  })

  const getUser = user.get('/', {
    responses: {
      200: {body: User},
    },
  })
  const getUserPost = user.get('/posts/:postId', {
    params: z.object({postId: z.number()}),
    responses: {
      200: {body: Post},
    },
  })

  it('infers request and response types of a simple endpoint', async () => {
    type Req = {
      body: z.infer<typeof LoginCredentials>
    }
    type Res = {
      status: 200
      headers: Record<string, string>
      body: {token: string}
    }
    expectTypeOf(login).toEqualTypeOf(async (_: Req): Promise<Res | AccessDeniedRes> => null as any)
  })

  it('infers request and response types of a composed endpoint', async () => {
    type Req = {
      params: {userId: number}
      headers: {token: string}
    }
    type Res = {
      status: 200
      headers: Record<string, string>
      body: z.infer<typeof User>
    }
    expectTypeOf(getUser).toEqualTypeOf(async (_: Req): Promise<Res | NotFoundRes | ServerErrRes> => null as any)
  })

  it('infers merged params for composed endpoint', async () => {
    type Req = {
      params: {userId: number; postId: number}
      headers: {token: string}
    }
    type Res = {
      status: 200
      headers: Record<string, string>
      body: z.infer<typeof Post>
    }
    expectTypeOf(getUserPost).toEqualTypeOf(async (_: Req): Promise<Res | NotFoundRes | ServerErrRes> => null as any)
  })

  it('uses default type for params if not provided', async () => {
    const getUser = api.get('/users/:id')
    type Req = {
      params: {id: number | string}
    }
    type Res = {
      status: number
      headers: Record<string, string>
      body: unknown
    }
    expectTypeOf(getUser).toEqualTypeOf(async (_: Req): Promise<Res> => null as any)
  })
})
