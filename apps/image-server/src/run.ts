import 'reflect-metadata'
import express, {json, urlencoded} from 'express'
import * as dotenv from 'dotenv'
import {
  imageFormat,
  imageRequest,
  imageTransform,
  imageTransformContext,
} from './middleware'

dotenv.config()

const DEFAULT_PORT = 8080
const port = process.env.PORT ?? DEFAULT_PORT
const NOT_FOUND = 404

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

app.listen(port, () => {
  console.info('http://localhost:8080')
})
