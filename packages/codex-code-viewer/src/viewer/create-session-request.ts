import type {Accessor} from 'solid-js'
import type {z} from 'zod'
import type {WorkspaceSession} from '../shared/contracts'
import type {ViewerPort} from './types'
import {callViewerTool} from './call-viewer-tool'

interface SessionRequest {
  readonly port: ViewerPort
  readonly session: Accessor<WorkspaceSession | null>
}

/** Calls a viewer tool with the currently active session. */
export const createSessionRequest =
  ({port, session}: SessionRequest) =>
  async <Value>(
    name: string,
    input: Record<string, unknown>,
    schema: z.ZodType<Value>,
  ): Promise<Value> => {
    const current = session()
    if (current === null) {
      throw new Error('Codex에서 파일을 먼저 열어 주세요.')
    }
    return callViewerTool({input: {...input, session: current.session}, name, port, schema})
  }
