import {readFile} from 'node:fs/promises'
import {realpathSync, statSync} from 'node:fs'
import {isAbsolute} from 'node:path'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {createServer} from '../server/create-server'

const [path, ...extra] = process.argv.slice(2)
if (path === undefined || !isAbsolute(path) || extra.length > 0 || !statSync(path).isDirectory()) {
  throw new Error('Usage: node claude.js /absolute/workspace/folder')
}
const workspaceRoot = realpathSync(path)
const html = (await readFile(new URL('./app.html', import.meta.url), 'utf8')).replace(
  '<html ',
  '<html data-host="standard" ',
)
const {dispose, server} = createServer(html, {integration: 'standard', workspaceRoot})
process.once('SIGINT', dispose)
process.once('SIGTERM', dispose)
process.stdin.once('end', dispose)
await server.connect(new StdioServerTransport())
