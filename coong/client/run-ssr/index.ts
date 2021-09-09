import {startServer} from './start-server'

const root = process.cwd()

startServer({
  root,
  entry: 'main-ssr'
}).then((context) => {
  const {port} = context
  console.log(`Server running at http://localhost:${port}`)
})
