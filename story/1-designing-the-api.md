# Desinging the library

The first thing I would like to do, given the list of desired features, is to imagine how would this library be used. To do so, let's consider an example API and use an imaginary `typed-client` library to create a client for it. Let base URL for the example API be `https://example.test`, and let it have the following endpoints:
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

The target `typed-client` library should make it easy to:
- Create a client for the API.
- Call endpoints and receive responses.
- Mock the API during tests.

The first code that came to mind looks as follows:

```ts
import {create} from 'typed-client'

type TaskStatus = 'waiting' | 'in-progress' | 'done'
type Task = {id: number, content: string, status: TaskStatus}
type AccessDeniedError = {error: 'AccessDenied', details: string}
type UnknownError = {error: 'Unknown', details: string}

// 1. Creating the client
const client = create('https://example.test')
  .post('/login')
    .body<{email: string, password: string}>()
    .response<200, {token: string}>()
    .response<401, AccessDenied>()
    .response<500, UnknownError>()
  .get('/tasks')
    .query<{search?: string, status?: TaskStatus}>()
    .header<string>('Authorization')
    .response<200, Task[]>()
    .response<401, AccessDenied>()
    .response<500, UnknownError>()
  .post('/tasks')
    .header<string>('Authorization')
    .body<{content: string}>()
    .response<201, Task>()
    .response<401, AccessDenied>()
    .response<500, UnknownError>()

// 2. Using the client to send requests and receive responses
const {token} = await client.post('/login').body({email: 'foo@bar.baz', password: 'secret'})
// if the response status is 200, then the token will contain the returned token and be typed as a string.
// if the response status is 401 or 500, then an error will be thrown containing the response.

const tasks = await client.get('/tasks').header('Authorization', token).query({status: 'in-progress'})
// This will send GET /tasks?status=in-progress with the Authorization header

// 3. Mocking the API during tests
test('some feature', async () => {
  client.mock()
    .post('/login')
      .body({email: 'foo@bar.baz', password: 'secret'})
      .response(200, {token: 'fake-token'})
    .post('/tasks')
      .header('Authorization', 'fake-token')
      .body({content: 'something to do'})
      .response(201, {id: 1, content: 'something to do', status: 'in-progress'})
  
  // run the code that uses `client`
  // the mocking above will ensure that these endpoints are called in the given order with the given headers/body
  // and the client will return the given responses
  // any request different than the described ones will throw an error

  // removes mocks
  client.unmock()
})
```

This code is far from ideal and misses many details. Let improve it

## The code to create a client

Starting with the following code:

```ts
type TaskStatus = 'waiting' | 'in-progress' | 'done'
type Task = {id: number, content: string, status: TaskStatus}
type AccessDeniedError = {error: 'AccessDenied', details: string}
type UnknownError = {error: 'Unknown', details: string}

const client = create('https://example.test')
  .post('/login')
    .body<{email: string, password: string}>()
    .response<200, {token: string}>()
    .response<401, AccessDenied>()
    .response<500, UnknownError>()
  .get('/tasks')
    .query<{search?: string, status?: TaskStatus}>()
    .header<string>('Authorization')
    .response<200, Task[]>()
    .response<401, AccessDenied>()
    .response<500, UnknownError>()
  .post('/tasks')
    .header<string>('Authorization')
    .body<{content: string}>()
    .response<201, Task>()
    .response<401, AccessDenied>()
    .response<500, UnknownError>()
```

I want to address the following points:

**1. Validate requests and responses:** Typing responses is good, but what if the API returns something different then what we expect? In that case validating the response is useful. Validating the requests can also be useful in the following cases:
- the request body has some rules that cannot be expressed with static types
- the project doesn't use Typescript.

**2. Use function parameters instead of generics:** The idea behind doing `.body<{content: string}>()` is to indicate that the type of the request body of this endpoint is `{content: string}`. But it looks weird and would be nicer if we could do `.body({content: String})` or something and infer the types from the parameter.

**3. Define response headers:** Some APIs return useful information in the headers of the response in addition to the body, we should be able to define the headers of the response like we do for the request.

**4. Remove duplication:** The `.response<401, AccessDenied>().response<500, UnknownError>()` is duplicated on all three endpoints, and `.header<string>('Authorization')` in two endpoints. is there a way to remove these duplications?

### Using `zod` to type and validate requests and responses:

This would solve the **points 1 and 2**. The idea is to do something like:

```ts
import z from 'zod'
import {create} from 'typed-client'

const TaskStatus = z.object({
  search: z.optional(z.string()),
  status: z.optional(z.enum(['waiting', 'in-progress', 'done']))
})
const Task = z.object{
  id: z.number(),
  content: z.string(),
  status: TaskStatus
}

const client = create('https://example.test')
  .post('/login')
    .body(z.object({
      email: z.string(),
      password: z.string()
    }))
    .response(200, z.object({token: z.string()}))
  .get('/tasks')
    .query(TaskStatus)
    .header('Authorization', z.string())
    .response(200, z.array(Task))
  // ...
```

I chose `zod` over other validation libraries because it's type inference is very good, which allows us to skip specifying the generics manually. It's also lightweight ([11kb](https://bundlephobia.com/package/zod@3.18.0) vs [42kb](https://bundlephobia.com/package/joi@17.6.0) for `joi` and [18kb](https://bundlephobia.com/package/yup@0.32.11) for `yup`).

### Specifying the response body and headers separately

To solve **point 3**, let the `.response()` take only the status as argument and use methods `.body()` and `.header()` to specify body and headers just like for requests.

```ts
const client = create('https://example.test')
  .post('/login')
    // ...
  .response(200)
    .body(z.object({token: z.string()}))
  .get('/tasks')
    // ...
  .response(200)
    .body(z.array(Task))
  // ...
```

### Grouping endpoints

To solve **point 4**, let's introduce a new method `.group()` that will group endpoints under a URL prefix and let us apply headers and responses to all of them.

```ts
const client = create('https://example.test')
  .group('/tasks', api => api
    .get('/tasks')
      .query(TaskStatus)
      .response(200).body(z.array(Task))
    .post('/tasks')
      .body(z.object({content: z.string()}))
      .response(201).body(Task)
  )
    .header('Authorization', z.string())
    .response(401).body(AccessDenied)
    .response(500).body(UnknownError)
```

### Improving readability

With all the improvements above, the code to create the client is:

```ts
import z from 'zod'
import {create} from 'typed-client'

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

const client = create('https://example.test')
  .group('/', api => 
    api.post('/login')
      .body(z.object({
        email: z.string(),
        password: z.string()
      }))
      .response(200).body(z.object({token: z.string()}))
    .get('/tasks')
      .query(z.object({
        search: z.string().optional(),
        status: TaskStatus.optional()
      }))
      .header('Authorization', z.string())
      .response(200).body(Task.array())
    .post('/tasks')
      .header('Authorization', z.string())
      .body(z.object({content: z.string()}))
      .response(201).body(Task)
  )
  .response(401).body(AccessDenied)
  .response(500).body(UnknownError)
```

This code looks fine with the current formatting, but I formatted it manually to make it clear where requests and responses are. If I let prettier format it, I end up with

```ts
api
  .post('/login')
  .body(
    z.object({
      email: z.string(),
      password: z.string(),
    })
  )
  .response(200)
  .body(z.object({token: z.string()}))
  .get('/tasks')
  .query(
    z.object({
      search: z.string().optional(),
      status: TaskStatus.optional(),
    })
  )
  .header('Authorization', z.string())
  .response(200)
  .body(Task.array())
  .post('/tasks')
  .header('Authorization', z.string())
  .body(z.object({content: z.string()}))
  .response(201)
  .body(Task)
```

Where it's really hard to see where each endpoint starts and ends.

To solve this readability issue, I changed the code to the following

```ts
api
  .post('/login', {
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
    query: z.object({
      search: z.string().optional(),
      status: TaskStatus.optional(),
    }),
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
```

Now looking at this code, it seems that I need to go the extra mile and move the response also inside the object parameter of the request. But I am not entirely sure about that, so I will just keep the API this way and make it possible to easily change it later during the implementation. I may end up supporting multiple APIs and letting the user choose whatever they like ...

## The code to use the client

The initial code to use the client was:

```ts
const {token} = await client.post('/login').body({email: 'foo@bar.baz', password: 'secret'})
// if the response status is 200, then the token will contain the returned token and be typed as a string.
// if the response status is 401 or 500, then an error will be thrown containing the response.

const tasks = await client.get('/tasks').header('Authorization', token).query({status: 'in-progress'})
// This will send GET /tasks?status=in-progress with the Authorization header
```

I want to address the following points:

**1. Use an object argument to specify headers, body, ... instead of chaining calls:** This would make it consistent with the API of creating the client.

**2. Return the response status, headers and body:** Right now, this code only returns the body of the response. It would be useful to access the response status and headers also.

**3. Do we really need to throw an error when status is not `2xx`?** I would like this library to be as flexible as possible, and I know there will be APIs that return error responses with a status of `200` or "success" response with something different than `200`. So assuming that the response is an error based on the status code will not always work. Also, even when having an error, maybe the user wants to handle it without a `try/catch` ... I think calling an endpoint should just return the response and let the user handle it however they want. I may add a possibility to configure the client to throw errors when the response status is not `2xx` later, let's keep the first version simple. 

**4. Handle validation failure:** Now that we are using `zod` to validate the requests and responses, how do we handle validation failures? For example, if the received response doesn't match what is expected, I think we should throw an error, because continuing the process with unknown data in the response doesn't make sense.

With these changes the code will look something like

```ts
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
```

## The code to mock the client

The initial code of mocking the client during tests looked as follows

```ts
test('some feature', async () => {
  client.mock()
    .post('/login')
      .body({email: 'foo@bar.baz', password: 'secret'})
      .response(200, {token: 'fake-token'})
    .post('/tasks')
      .header('Authorization', 'fake-token')
      .body({content: 'something to do'})
      .response(201, {id: 1, content: 'something to do', status: 'in-progress'})
  
  // run the code that uses `client`
  // the mocking above will ensure that these endpoints are called in the given order with the given headers/body
  // and the client will return the given responses
  // any request different than the described ones will throw an error

  // removes mocks
  client.unmock()
})
```

I want to address the following points:

**1. Make the API consistent with the changes above:** Use object parameter instead of chaining methods.

**2. Make it possible to custom assert requests:** Instead of specifying literal values for the expected headers and body, it would be useful to be able to run custom assertions on the request.

After applying these modifications, the code becomes:

```ts
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
