import {createInterface} from 'node:readline/promises'
import {randomUUID} from 'node:crypto'
import {z} from 'zod'
import {commandRequestSchema} from '../backend/command-schemas'
import type {HostConnection} from '../backend/node/start-node-host'
import {sendCommand} from './connection'

const shellRequestSchema = commandRequestSchema.extend({
  requestId: z.string().min(1).default(randomUUID),
})

/** Reads one JSON command per line; closing the shell leaves the shared host running. */
export const runShell = async (connection: HostConnection): Promise<void> => {
  const terminal = createInterface({input: process.stdin, output: process.stderr})
  try {
    for await (const line of terminal) {
      if (line.trim() === 'exit') {
        return
      }
      try {
        const command = shellRequestSchema.parse(JSON.parse(line))
        const result = await sendCommand(connection, command)
        process.stdout.write(`${JSON.stringify(result)}\n`)
      } catch (error) {
        process.stdout.write(
          `${JSON.stringify({error: error instanceof Error ? error.message : 'Invalid command', ok: false})}\n`,
        )
      }
    }
  } finally {
    terminal.close()
  }
}
