import {expressSharp, HttpAdapter} from 'express-sharp'
import express from 'express'
import * as dotenv from 'dotenv'

dotenv.config()

const DEFAULT_PORT = 8080
const prefixUrl = process.env.TARGET_URL ?? 'https://picsum.photos'
const originUrl = process.env.CORS_ORIGIN ?? prefixUrl
const port = process.env.PORT ?? DEFAULT_PORT

const app = express()

app.use(
  '/',
  expressSharp({
    autoUseWebp: true,
    cors: {
      origin: originUrl,
    },
    imageAdapter: new HttpAdapter({
      prefixUrl,
    }),
  }),
)

app.listen(port, () => {
  console.log('http://localhost:8080')
})
