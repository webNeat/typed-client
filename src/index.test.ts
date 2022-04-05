import create from './index'

describe('typed-client', () => {
  type User = {id: number; username: string; bio: string}
  type ServerError = {type: 'unknown'; reason: string}
  type NotFoundError = {type: 'not-found'; reason: string}

  const api = create('http://localhost')
    .group('/users', (api) =>
      api.get('/').response<200, User[]>().get('/{id}').response<200, User>().response<404, NotFoundError>()
    )
    .response<500, ServerError>()
})
