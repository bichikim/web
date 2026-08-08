import 'reflect-metadata'
import express, {type ErrorRequestHandler, json, urlencoded} from 'express'
import * as dotenv from 'dotenv'
import {imageFormat, imageRequest, imageTransform, imageTransformContext} from './middleware'
import {ImageRequestError} from './middleware/safe-image-request'

dotenv.config()

const DEFAULT_PORT = 8080
const port = process.env.PORT ?? DEFAULT_PORT
const NOT_FOUND = 404
const INTERNAL_SERVER_ERROR = 500

const app = express()

//
app.use(json())
app.use(urlencoded({extended: false}))
app.use(imageFormat())
app.use(imageRequest())
app.use(imageTransform())

app.get('/:url(*)', (req, res) => {
  const imageTransform = imageTransformContext.use(req)

  if (imageTransform) {
    res.type(`image/${imageTransform.format}`)
    res.send(imageTransform.image)

    return
  }

  res.status(NOT_FOUND).send('Not found')
})

const handleError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  const isRequestError = error instanceof ImageRequestError
  const statusCode = isRequestError ? error.statusCode : INTERNAL_SERVER_ERROR

  if (!isRequestError) {
    console.error(error)
  }

  res.status(statusCode).json({
    message: isRequestError ? error.message : 'Internal server error',
  })
}

app.use(handleError)

app.listen(port, () => {
  console.info(`http://localhost:${port}`)
})
