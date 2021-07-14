import 'reflect-metadata'
import {prepare, start} from 'src/server'

const bootstrap = async () => {
  const {server} = await prepare({
    playground: process.env.NODE_ENV === 'development',
  })
  return start(server)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap().then(({url}) => {
  console.log(`Server is running, GraphQL Playground available at ${url}`)
})
