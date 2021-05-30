import 'reflect-metadata'
import {prepare, start} from './server'

const bootstrap = async () => {
  const {server} = await prepare({
    playground: process.env.NODE_ENV === 'development',
  })
  return start(server)
}

bootstrap().then(({url}) => {
  console.log(`Server is running, GraphQL Playground available at ${url}`)
})
