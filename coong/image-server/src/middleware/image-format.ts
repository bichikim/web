import {RequestHandler} from 'express'

export const imageFormat = (): RequestHandler => {
  return (req, res, next) => {

    if (req.headers.accept?.includes('image/webp')) {
      req.query.format = 'webp'
    }

    next()
  }
}
