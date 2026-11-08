import {Server} from '@modelcontextprotocol/sdk/server/index.js'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {CallToolRequestSchema, ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js'
import {randomUUID} from 'node:crypto'
import {z} from 'zod'
import {sendCommand} from './connection'
import type {HostConnection} from '../backend/node/start-node-host'

/** Adapts the running host catalog to standard MCP without creating a second model session. */
export const runMcp = async (connection: HostConnection): Promise<void> => {
  const server = new Server({name: 'poffo', version: '0.1.0'}, {capabilities: {tools: {}}})
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        description: 'Discover Poffo operations and their input schemas before editing.',
        inputSchema: {properties: {}, type: 'object'},
        name: 'poffo_operations',
      },
      {
        description: 'Execute an operation on the same model session used by the GUI and CLI.',
        inputSchema: {
          properties: {
            input: {additionalProperties: true, type: 'object'},
            operation: {type: 'string'},
          },
          required: ['operation'],
          type: 'object',
        },
        name: 'poffo_call',
      },
    ],
  }))
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const input =
      request.params.name === 'poffo_operations'
        ? {input: {}, operation: 'operations.list'}
        : z
            .object({input: z.unknown().optional(), operation: z.string()})
            .parse(request.params.arguments)
    if (request.params.name !== 'poffo_operations' && request.params.name !== 'poffo_call') {
      throw new Error('Unknown Poffo tool')
    }
    const result = await sendCommand(connection, {...input, requestId: randomUUID()})
    return {
      content: [{text: JSON.stringify(result), type: 'text'}],
      isError: !result.ok,
      structuredContent: {...result},
    }
  })
  await server.connect(new StdioServerTransport())
}
