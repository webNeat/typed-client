export type MakeUndefinedOptional<T, K extends keyof T = OptionalKeys<T>> = Partial<Pick<T, K>> & Omit<T, K>

type OptionalKeys<T> = Extract<
  {
    [key in keyof T]: undefined extends T[key] ? [key, never] : [key, T[key]]
  }[keyof T],
  [any, never]
>[0]

export type Normalize<T> = {
  [key in keyof T as T[key] extends undefined | never ? never : key]: T[key]
}

export type Merge<A, B> = {
  [key in keyof A | keyof B]: key extends keyof B ? B[key] : key extends keyof A ? A[key] : never
}
