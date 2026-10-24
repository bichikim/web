import {treeStateSchema} from '../shared/tree-state'
import {callViewerTool} from './call-viewer-tool'
import type {createPendingTasks} from './create-pending-tasks'
import type {ViewerPort} from './types'

interface TreeStateWriterOptions {
  /** 저장 도구를 호출합니다. 호출이 실패하면 반환한 Promise가 거부됩니다. */
  readonly call: ViewerPort['call']
  /** 대기 중인 저장도 호스트 종료 전에 완료하도록 추적합니다. */
  readonly requests: ReturnType<typeof createPendingTasks>
}
interface TreeStateWriter {
  readonly save: NonNullable<ViewerPort['saveTreeState']>
  readonly settle: () => Promise<void>
}

/** 상태 변경을 순서대로 저장하며 실패한 저장 뒤에도 다음 변경을 처리합니다. */
export const createTreeStateWriter = (options: TreeStateWriterOptions): TreeStateWriter => {
  let writes = Promise.resolve()
  const save: TreeStateWriter['save'] = (session, patch) => {
    const previous = writes
    const pending = options.requests.run(async () => {
      await previous
      await callViewerTool({
        input: {patch, session},
        name: 'code.tree-state',
        port: options,
        schema: treeStateSchema,
      })
    })
    writes = pending.catch(() => undefined)
    return pending
  }
  return {save, settle: () => writes}
}
