import {startServer} from './start-server'

const isProduction = process.env.NODE_ENV === 'production'
const root = `${__dirname}/..`

startServer({
  production: isProduction,
  root,
}).then((context) => {
  const {port} = context
  console.log(`Server running at http://localhost:${port}`)
})
