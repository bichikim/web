import {Hono} from 'hono'

/** `GET /` */
export const homeRoute = new Hono()

homeRoute.get('/', (context) => {
  return context.text('@apps/cli-server')
})
