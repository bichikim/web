import {ErrorCode, McpError} from '@modelcontextprotocol/sdk/types.js'
import {z} from 'zod'
import type {ViewerPort} from './types'
import {callViewerTool} from './call-viewer-tool'

interface WorkspaceChangesOptions {
  readonly call: ViewerPort['call']
  readonly session: string
  readonly receive: () => void
  readonly report: (error: unknown) => void
}

const revisionSchema = z.object({revision: z.number().int().nonnegative()})

/** Receives workspace changes through cancellable MCP waits until released by the caller. */
export const subscribeWorkspaceChanges = async (
  options: WorkspaceChangesOptions,
): Promise<() => Promise<void>> => {
  let {revision} = await callViewerTool({
    input: {session: options.session, transport: 'mcp'},
    name: 'code.watch',
    port: {call: options.call},
    schema: revisionSchema,
  })
  const controller = new AbortController()
  options.receive()
  const listen = async (): Promise<void> => {
    while (!controller.signal.aborted) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- Each request waits for the next filesystem event.
        const next = await callViewerTool({
          input: {revision, session: options.session},
          name: 'code.watch.next',
          port: {call: options.call},
          // Expire the app request before the host's tool deadline, then reconnect without rescanning files.
          request: {signal: controller.signal, timeout: 30_000},
          schema: revisionSchema,
        })
        if (!controller.signal.aborted && next.revision !== revision) {
          ;({revision} = next)
          options.receive()
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }
        // Reconnect only when the protocol's existing request deadline expires.
        if (!(error instanceof McpError && error.code === ErrorCode.RequestTimeout)) {
          throw error
        }
      }
    }
  }
  const listening = listen().catch(options.report)
  return async () => {
    controller.abort()
    await listening
  }
}
