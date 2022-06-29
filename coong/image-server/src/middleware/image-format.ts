import {RequestHandler} from 'express'
import {createProvideContext} from '../utils/context'

export const formatContext = createProvideContext<string | undefined>()

export const imageFormat = (): RequestHandler => {
  return (req, res, next) => {
    // eslint-disable-next-line id-length
    const {f} = req.query

    const {format = f} = req.query

    let myFormat = format ? String(format) : undefined

    if (!myFormat && req.headers.accept?.includes('image/webp')) {
      myFormat = 'webp'
    }

    formatContext.provide(req, myFormat)

    next()
  }
}
