import {Hono} from 'hono'

export const healthRoute = new Hono().get('/', (context) =>
  context.json({
    ok: true,
  }),
)
