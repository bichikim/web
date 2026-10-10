import {once} from 'node:events'
import {type MessagePort, parentPort, workerData} from 'node:worker_threads'
import {z} from 'zod'
import {navigationInputSchema} from '../shared/contracts'
import {createWorkspace} from './create-workspace'
import {streamNavigation} from './stream-navigation'

const port = parentPort
if (port === null) {
  throw new Error('Navigation requires a worker thread')
}
const workspace = createWorkspace(z.string().parse(workerData))
port.on(
  'message',
  async ({
    input,
    channel,
    review,
  }: {
    readonly input: unknown
    readonly channel: MessagePort
    readonly review: unknown
  }) => {
    try {
      const request = navigationInputSchema.parse(input)
      const scope = z
        .object({
          files: z.array(z.string()).optional(),
          retained: z.array(z.string()).optional(),
        })
        .parse(review)
      const document = workspace.read(request.path)
      if (!document.ok) {
        throw new Error(document.error.code)
      }
      if (document.value.revision !== request.revision) {
        throw new Error('stale-document')
      }
      for await (const batch of streamNavigation({
        ...request,
        document: document.value,
        signal: new AbortController().signal,
        workspace: {
          ...workspace,
          references: (path, offset, sources) => workspace.references(path, offset, sources, scope),
        },
      })) {
        // Wait for the transport to consume this batch before preparing the next one.
        const consumed = once(channel, 'message')
        channel.postMessage({batch})
        await consumed
      }
      channel.postMessage({done: true})
    } catch (error) {
      channel.postMessage({error: error instanceof Error ? error.message : 'read-failed'})
    } finally {
      channel.close()
    }
  },
)
