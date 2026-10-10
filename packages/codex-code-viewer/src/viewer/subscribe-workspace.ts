import {streamEndpointSchema} from '../shared/contracts'
import type {ViewerPort} from './types'
import {callViewerTool} from './call-viewer-tool'

interface WorkspaceSubscriptionOptions {
  readonly call: ViewerPort['call']
  readonly session: string
  readonly receive: () => void
}
/** Subscribes to local workspace signals until the caller releases the subscription. */
export const subscribeWorkspace = async (
  options: WorkspaceSubscriptionOptions,
): Promise<() => Promise<void>> => {
  const result = await callViewerTool({
    input: {session: options.session},
    name: 'code.watch',
    port: {call: options.call},
    schema: streamEndpointSchema,
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
