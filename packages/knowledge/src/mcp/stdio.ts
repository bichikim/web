import {resolve} from 'node:path'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {z} from 'zod'
import {
  getKnowledgeRepository,
  KnowledgeCommandFailure,
  relatedKnowledgeRepository,
  searchKnowledgeRepository,
} from '../cli/runtime'
import {createKnowledgeServer, type KnowledgeToolResult} from './server'

const errorSchema = z.object({error: z.object({code: z.string()})})
const invoke = async <T>(operation: () => Promise<T>): Promise<KnowledgeToolResult<T>> => {
  try {
    return {ok: true, value: await operation()}
  } catch (error) {
    const parsed =
      error instanceof KnowledgeCommandFailure ? errorSchema.safeParse(error.result) : undefined
    return {
      error: {code: parsed?.success ? parsed.data.error.code : 'knowledge-request-failed'},
      ok: false,
    }
  }
}

/** Serves one configured repository over stdio until EOF or termination; stdout is protocol-only. */
export const serveKnowledgeStdio = async (inputPath: string): Promise<number> => {
  const root = resolve(inputPath)
  const server = createKnowledgeServer({
    get: (logicalId) => invoke(() => getKnowledgeRepository({inputPath: root, logicalId})),
    related: (options) => invoke(() => relatedKnowledgeRepository({...options, inputPath: root})),
    search: (options) => invoke(() => searchKnowledgeRepository({...options, inputPath: root})),
  })
  const transport = new StdioServerTransport()
  const {promise: closed, resolve: finish} = Promise.withResolvers<void>()
  const stop = (): void => {
    server.close().then(finish, finish)
  }
  server.server.onclose = finish
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  process.stdin.once('end', stop)
  try {
    await server.connect(transport)
    await closed
    return 0
  } finally {
    process.off('SIGINT', stop)
    process.off('SIGTERM', stop)
    process.stdin.off('end', stop)
    await server.close()
  }
}
