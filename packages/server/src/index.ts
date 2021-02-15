import {createServer} from './server'

const server = createServer({
  playground: process.env.NODE_ENV === 'development',
})

server.start()
