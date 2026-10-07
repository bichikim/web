import {readFile} from 'node:fs/promises'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {createServer} from './create-server'

const html = await readFile(new URL('./app.html', import.meta.url), 'utf8')
const {dispose, server} = createServer(html)
process.once('SIGINT', dispose)
process.once('SIGTERM', dispose)
await server.connect(new StdioServerTransport())
