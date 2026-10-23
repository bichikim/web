import {type Result, success, type WorkspaceSession} from '../shared/contracts'
import type {createThreadTreeState} from './create-thread-tree-state'

/** 새 연결에 현재 채팅과 작업 폴더의 파일트리 상태를 포함합니다. */
export const restoreTreeState = <Value extends WorkspaceSession>(
  result: Result<Value>,
  storage: ReturnType<typeof createThreadTreeState> | undefined,
  metadata: unknown,
): Result<Value> => {
  if (!result.ok || storage === undefined) {
    return result
  }
  const saved = storage.read(metadata, result.value.workspace)
  if (!saved.ok) {
    console.error('Code Viewer could not restore tree state:', saved.error.code)
    return result
  }
  return success({...result.value, treeState: saved.value})
}
