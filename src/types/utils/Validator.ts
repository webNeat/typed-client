import z from 'zod'
import {Is} from 'just-types'
import {Equal, Extends} from 'expect-type'
import {Normalize} from './Objects'

export type Validator<T = any> = T extends never ? never : z.ZodType<T>
export type Validators<T> = {
  [key in keyof T]: Validator<T[key]>
}

export type ValidatorType<V> = V extends Validator ? z.TypeOf<V> : never
export type ValidatorTypes<T> = Normalize<{
  [key in keyof T]: ValidatorType<T[key]>
}>

// Testing
const User = z.object({id: z.number(), email: z.string(), role: z.enum(['user', 'author', 'admin'])})
const Post = z.object({id: z.number(), title: z.string(), content: z.string(), tags: z.array(z.string())})
type Data = {
  id: number
  user: typeof User
  post: typeof Post
  date: Date
}
type Tests = [
  Is<Extends<typeof User, Validator<{id: number; email: string; role: 'user' | 'author' | 'admin'}>>>,
  Is<Equal<ValidatorType<typeof User>, {id: number; email: string; role: 'user' | 'author' | 'admin'}>>,
  Is<Equal<ValidatorType<number>, never>>,
  Is<
    Equal<
      ValidatorTypes<Data>,
      {
        post: {id: number; title: string; content: string; tags: string[]}
        user: {id: number; email: string; role: 'user' | 'author' | 'admin'}
      }
    >
  >,
]
