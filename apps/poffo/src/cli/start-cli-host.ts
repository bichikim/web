import {rm} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'
import {startNodeHost} from '../backend/node/start-node-host'
import {readConnection, sendCommand} from './connection'
import {openGui} from './open-gui'
import type {parseCliArguments} from './parse-cli-arguments'

type CliValues = ReturnType<typeof parseCliArguments>['values']

const hasLiveProcess = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const attachExisting = async (workspace: string, values: CliValues) => {
  let existing
  try {
    existing = await readConnection(workspace)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  }
  try {
    const status = await sendCommand(existing, {operation: 'status', requestId: randomUUID()})
    if (!status.ok) {
      throw new Error(status.error.message)
    }
    if (values.cli !== true) {
      openGui(existing, workspace)
    }
    return {connected: true, sessionId: existing.sessionId, url: existing.url}
  } catch (error) {
    if (hasLiveProcess(existing.pid)) {
      throw error
    }
    await rm(resolve(workspace, '.poffo/connection.json'))
    return undefined
  }
}

export const startCliHost = async (
  command: 'dev' | 'start',
  workspace: string,
  values: CliValues,
) => {
  if (command === 'dev' && process.env.POFFO_RUNTIME_ROOT !== undefined) {
    throw new Error('Development mode requires the Poffo source workspace')
  }
  const attached = await attachExisting(workspace, values)
  if (attached !== undefined) {
    return attached
  }
  const host = await startNodeHost({
    file: values.file,
    guiRoot: fileURLToPath(new URL('../', import.meta.url)),
    port: values.port === undefined ? undefined : Number(values.port),
    trustedOrigins: [
      'tauri://localhost',
      'http://tauri.localhost',
      'https://tauri.localhost',
      ...(values['native-origin'] === undefined ? [] : [values['native-origin']]),
    ],
    workspace,
  })
  if (command === 'dev') {
    const {createServer} = await import('vite')
    try {
      const vite = await createServer({
        configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
        root: fileURLToPath(new URL('../../', import.meta.url)),
        server: {hmr: {server: host.server}, middlewareMode: true},
      })
      host.setMiddleware(vite.middlewares)
      host.server.once('close', () => {
        vite.close().catch(console.error)
      })
    } catch (error) {
      await host.close(true)
      throw error
    }
  }
  const interrupt = () => {
    host.close(true).catch((error: unknown) => process.stderr.write(`${String(error)}\n`))
  }
  if (values['parent-stdio'] === true) {
    process.stdin.once('end', interrupt)
    process.stdin.resume()
  }
  process.once('SIGINT', interrupt)
  process.once('SIGTERM', interrupt)
  host.server.once('close', () => {
    if (values['parent-stdio'] === true) {
      process.stdin.off('end', interrupt)
      process.stdin.destroy()
    }
    process.off('SIGINT', interrupt)
    process.off('SIGTERM', interrupt)
  })
  if (values.cli !== true) {
    openGui(host.connection, workspace)
  }
  return {
    connectionFile: host.connectionPath,
    ready: true,
    sessionId: host.connection.sessionId,
    url: host.connection.url,
  }
}
