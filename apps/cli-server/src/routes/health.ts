import {Hono} from 'hono'

/** `GET /health` */
export const healthRoute = new Hono()

healthRoute.get('/', (context) => {
  return context.json({ok: true})
})
