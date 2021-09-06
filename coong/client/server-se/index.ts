import {startServer} from './start-server'
import path from 'path'
import fs from 'fs'

const isProduction = process.env.NODE_ENV === 'production'
const root = process.cwd()

const template = isProduction ? fs.readFileSync(path.resolve(root, 'dist/client/index.html'), 'utf-8') : ''

startServer({
  production: isProduction,
  root,
  template: () => {
    if (isProduction) {
      return template
    }
    return fs.readFileSync(path.resolve(root, 'index.html'), 'utf-8')
  },
}).then((context) => {
  const {port} = context
  console.log(`Server running at http://localhost:${port}`)
})
