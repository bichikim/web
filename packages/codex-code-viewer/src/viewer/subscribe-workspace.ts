import {z} from 'zod'
import type {ViewerPort} from './types'
import {callViewerTool} from './call-viewer-tool'

interface WorkspaceSubscriptionOptions {
  readonly call: ViewerPort['call']
  readonly session: string
  readonly receive: () => void
}
const endpointSchema = z.object({
  url: z.url().refine((value) => {
    const url = new URL(value)
    return (
      url.protocol === 'http:' &&
      url.hostname === '127.0.0.1' &&
      url.username === '' &&
      url.password === ''
    )
  }),
})

/** Subscribes to local workspace signals until the caller releases the subscription. */
export const subscribeWorkspace = async (
  options: WorkspaceSubscriptionOptions,
): Promise<() => Promise<void>> => {
  const result = await callViewerTool({
    input: {session: options.session},
    name: 'code.watch',
    port: {call: options.call},
    schema: endpointSchema,
  })
  const events = new EventSource(result.url)
  let revision: string | null = null
  const handleChange = (event: MessageEvent<string>): void => {
    if (/^\d+$/u.test(event.data) && event.data !== revision) {
      revision = event.data
      options.receive()
    }
  }
  events.addEventListener('message', handleChange)
  return async () => {
    events.removeEventListener('message', handleChange)
    events.close()
  }
}
