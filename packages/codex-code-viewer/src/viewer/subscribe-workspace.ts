import {streamEndpointSchema} from '../shared/contracts'
import {z} from 'zod'
import type {OpenAIExtensions} from '@openai/mcp-extensions/app'
import type {ViewerPort} from './types'
import {callViewerTool} from './call-viewer-tool'

interface WorkspaceSubscriptionOptions {
  readonly resources?: Pick<
    NonNullable<OpenAIExtensions['resources']>,
    'subscribe' | 'unsubscribe' | 'addUpdateHandler'
  >
  readonly call: ViewerPort['call']
  readonly session: string
  readonly receive: () => void
}
/** Subscribes to local workspace signals until the caller releases the subscription. */
export const subscribeWorkspace = async (
  options: WorkspaceSubscriptionOptions,
): Promise<() => Promise<void>> => {
  const {resources} = options
  if (resources !== undefined) {
    const {resourceUri} = await callViewerTool({
      input: {session: options.session, transport: 'mcp'},
      name: 'code.watch',
      port: {call: options.call},
      schema: z.object({resourceUri: z.string().startsWith('code-viewer://workspace/')}),
    })
    const remove = resources.addUpdateHandler(({params}) => {
      if (params.uri === resourceUri) {
        options.receive()
      }
    })
    try {
      await resources.subscribe({uri: resourceUri})
      options.receive()
    } catch (error) {
      remove()
      throw error
    }
    return async () => {
      remove()
      await resources.unsubscribe({uri: resourceUri})
    }
  }
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
