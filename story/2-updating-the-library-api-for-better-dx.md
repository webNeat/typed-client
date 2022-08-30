# Updating the library API for better DX

Last time, I defined an example API with the base URL `https://example.test`, and the following endpoints:
- `POST /login`
  - body `{email: string, password: string}`. 
  - returns `200` response with body `{token: string}`.
  - or `401` response with body `{error: 'WrongCredentials', details: string}`.
- `GET /tasks`:
  - query parameters: `{search?: string, status?: 'waiting' | 'in-progress' | 'done'}`.
  - header `{Authorization: '{token}'}`.
  - returns `200` response with body `Array<{id: number, content: string, status: 'waiting' | 'in-progress' | 'done'}>`.
  - or `401` response with body `{error: 'AccessDenied', details: string}`.
- `POST /tasks`
  - header `{Authorization: '{token}'}`.
  - body `{content: string}`.
  - returns `201` response with body `{id: number, content: string, status: 'waiting' | 'in-progress' | 'done'}`.
  - or `401` response with body `{error: 'AccessDenied', details: string}`.
- All endpoints could also return a `500` response with body `{error: 'Unknown', details: string}`.

The code I ended up with to create and use a client for this example API is:

```ts
import z from 'zod'
import {create} from 'typed-client'

// Define validators with zod
const TaskStatus = z.enum(['waiting', 'in-progress', 'done'])
const Task = z.object({
  id: z.number(),
  content: z.string(),
  status: TaskStatus
})
const AccessDeniedError = z.object({
  error: z.literal('AccessDenied'),
  details: z.string()
})
const UnknownError = z.object({
  error: z.literal('Unknown'),
  details: z.string()
})

// Create the client
const client = create('https://example.test')
  .group('/', api => 
    api.post('/login', {
      body: z.object({
        email: z.string(),
        password: z.string(),
      }),
    })
    .response(200, {
      body: z.object({
        token: z.string()
      }),
    })
    .get('/tasks', {
      query: {
        search: z.string().optional(),
        status: TaskStatus.optional(),
      },
      headers: {
        Authorization: z.string()
      }
    })
    .response(200, {
      body: Task.array()
    })
    .post('/tasks', {
      headers: {
        Authorization: z.string()
      },
      body: z.object({
        content: z.string()
      }),
    })
    .response(201, {
      body: Task
    })
  )
  .response(401).body(AccessDenied)
  .response(500).body(UnknownError)

// Use the client
const res = await client.post('/login', {
  body: {email: 'foo@bar.baz', password: 'secret'}
})
if (res.status === 200) {
  const {token} = res.body
  // the type of the body will be infered by Typescript based on the status value
}
if (res.status === 401 ) {
  const {details} = res.body
  // handle the access denied error
}
if (res.status === 500 ) {
  const {details} = res.body
  // handle the unknown server error
}

const res = await client.get('/tasks', {
  query: {status: 'in-progress'},
  headers: {Authorization: '...'}
})
// This will send GET /tasks?status=in-progress with the Authorization header
if (res.status === 200) {
  const tasks = res.body
  // ...
}

// Mock it during tests
test('some feature', async () => {
  client.mock()
    .post('/login', {
      body: {email: 'foo@bar.baz', password: 'secret'}
    })
    .response(200, {
      body: {token: 'fake-token'}
    })
    .post('/tasks', {
      headers: {Authorization: 'fake-token'},
      body: value => {
        expect(value.content).toBeTruthy()
      }
    })
    .response(201, {
      headers: {...},
      body: {id: 1, content: 'something to do', status: 'in-progress'}
    })

  // ...

  // removes mocks
  client.unmock()
})
```

This code is fine, but it can be improved further. A better approach would be the following:

**client.ts**
```ts
import z from 'zod'
import tc from 'typed-client'

// Define validators with zod
const TaskStatus = z.enum(['waiting', 'in-progress', 'done'])
const Task = z.object({
  id: z.number(),
  content: z.string(),
  status: TaskStatus,
})
const AccessDeniedError = z.object({
  error: z.literal('AccessDenied'),
  details: z.string(),
})
const UnknownError = z.object({
  error: z.literal('Unknown'),
  details: z.string(),
})

// Create the API
const api = tc.create({
  url: 'https://example.test',
  responses: {
    401: {body: AccessDeniedError},
    500: {body: UnknownError},
  },
})

// Create endpoints
export const login = api.post('/login', {
  body: z.object({
    email: z.string(),
    password: z.string(),
  }),
  response: {
    status: 200,
    body: z.object({token: z.string()}),
  },
})

export const getTasks = api.get('/tasks', {
  query: {
    search: z.string().optional(),
    status: TaskStatus.optional(),
  },
  headers: {
    Authorization: z.string(),
  },
  response: {
    status: 200,
    body: Task.array(),
  },
})

export const addTask = api.post('/tasks', {
  headers: {
    Authorization: z.string(),
  },
  body: z.object({
    content: z.string(),
  }),
  response: {
    status: 201,
    body: Task,
  },
})
```

**usage.ts**
```ts
import * as client from './client'

let res = await client.login({
  body: {email: 'foo@bar.baz', password: 'secret'},
})
if (res.status === 200) {
  const {token} = res.body
  // the type of the body will be infered by Typescript based on the status value
}
if (res.status === 401) {
  const {details} = res.body
  // handle the access denied error
}
if (res.status === 500) {
  const {details} = res.body
  // handle the unknown server error
}

res = await client.getTasks({
  query: {status: 'in-progress'},
  headers: {Authorization: '...'},
})
// This will send GET /tasks?status=in-progress with the Authorization header
if (res.status === 200) {
  const tasks = res.body
  // ...
}
```

**usage.test.ts**
```ts
import * as client from './client'

test('some feature', async () => {
  client.login.mock({
    body: {email: 'foo@bar.baz', password: 'secret'},
    response: {
      status: 200,
      body: {token: 'fake-token'}
    }
  })
  client.addTask.mock({
    headers: {Authorization: 'fake-token'},
    body: value => {
      expect(value.content).toBeTruthy()
    },
    response: {
      status: 201,
      headers: {...},
      body: {id: 1, content: 'something to do', status: 'in-progress'}
    }
  })

  // Run your code ...

  // removes mocks
  client.unmock()
})
```

Here are some reasons why I prefer this approach over the previous one:
- **Better auto-complete & documentation:** With the previous approach, if I want to call the `/login` endpoint, I would type `client.post('/login', {...})`. It requires me to know the HTTP method and the URL of the endpoint in order to use it. The new approach allows me to just type `client.` and hit `ctrl+space` on VSCode to have the list of all endpoints. Additional documentation of each endpoint can be added as a DocBlock when creating it and will show in the editor autocomplete making the client easier to use.

- **Flexibility:** Defining each endpoint as a separate function makes allows us to do things like:
```ts
export const login = api.post('/login', ...)
export const tasks = {
  add: api.post('/tasks',...),
  get: api.get('/tasks', ...)
}
```
Allowing the users of the client to do
```ts
await client.login({...})
await client.tasks.add({...})
await client.tasks.get({...})
```
If the API has a lot of endpoints, it makes sense to use this sort of design to organize them under namespaces.

- **Makes the client tree-shakable:** If I only need to use the `getTasks` endpoint on my code, I can `import {getTasks} from 'my-client'` and have only the code of this endpoint added to my bundle.
