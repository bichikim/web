import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {commandResponseSchema, connectionSchema} from '../backend/protocol'
import type {CommandRequest} from '../backend/command-schemas'
import type {HostConnection} from '../backend/node/start-node-host'

export const readConnection = async (workspace: string): Promise<HostConnection> => {
  const connection = connectionSchema.parse(
    JSON.parse(await readFile(join(workspace, '.poffo/connection.json'), 'utf8')),
  )
  const url = new URL(connection.url)
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error('Connection descriptor must reference a loopback Poffo host')
  }
  return connection
}

const COMMAND_LIMIT = 30_000

export const sendCommand = async (connection: HostConnection, request: CommandRequest) => {
  const response = await fetch(`${connection.url}/api/command`, {
    body: JSON.stringify(request),
    headers: {Authorization: `Bearer ${connection.token}`, 'Content-Type': 'application/json'},
    method: 'POST',
    signal: AbortSignal.timeout(COMMAND_LIMIT),
  })
  if (!response.ok) {
    throw new Error(`Host request failed: ${response.status}`)
  }
  return commandResponseSchema.parse(await response.json())
}
