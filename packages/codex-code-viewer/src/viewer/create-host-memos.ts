import {memoStateSchema} from '../shared/memo-state'
import {callViewerTool} from './call-viewer-tool'
import type {createPendingTasks} from './create-pending-tasks'
import type {ViewerPort} from './types'

interface HostMemosOptions {
  readonly call: ViewerPort['call']
  readonly requests: ReturnType<typeof createPendingTasks>
  readonly ready: () => Promise<void> | null
}

export const createHostMemos = (options: HostMemosOptions) => {
  let writes = Promise.resolve()
  const ready = async (): Promise<void> => {
    const connection = options.ready()
    if (connection === null) {
      throw new Error('MCP 연결이 필요합니다.')
    }
    await connection
  }
  const readMemos: NonNullable<ViewerPort['readMemos']> = () =>
    options.requests.run(async () => {
      await ready()
      await writes
      return callViewerTool({input: {}, name: 'code.memos', port: options, schema: memoStateSchema})
    })
  const saveMemos: NonNullable<ViewerPort['saveMemos']> = (patch) => {
    const previous = writes
    const pending = options.requests.run(async () => {
      await ready()
      await previous
      return callViewerTool({
        input: {patch},
        name: 'code.save-memos',
        port: options,
        schema: memoStateSchema,
      })
    })
    writes = pending.then(
      () => undefined,
      () => undefined,
    )
    return pending
  }
  return {readMemos, saveMemos}
}
