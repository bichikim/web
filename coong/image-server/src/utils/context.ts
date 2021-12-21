import {Request} from 'express'

export const createProvideContext = <T>() => {
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
