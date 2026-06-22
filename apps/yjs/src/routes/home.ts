import {Hono} from 'hono'

export const homeRoute = new Hono().get('/', (context) =>
  context.json({
    name: '@apps/yjs',
    websocketPath: '/collaboration/:room',
  }),
)
