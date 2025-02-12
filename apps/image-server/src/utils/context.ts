import {Request} from 'express'

export interface ProvideContext<T> {
  provide(req: Request, data: T): void
  use(req: Request): T | undefined
}

export const createProvideContext = <T>(): ProvideContext<T> => {
  const map = new WeakMap<Request, T>()

  return {
    provide: (req: Request, data: T) => {
      map.set(req, data)
    },
    use: (req: Request): T | undefined => {
      return map.get(req)
    },
  }
}
