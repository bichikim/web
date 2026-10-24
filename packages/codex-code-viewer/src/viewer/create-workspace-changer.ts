import type {WorkspaceSession} from '../shared/contracts'
import type {ViewerPort} from './types'

interface CreateWorkspaceChangerOptions {
  /** 작업 폴더 변경 기능을 제공하는 호스트입니다. */
  readonly port: Pick<ViewerPort, 'changeWorkspace'>
  /** 미저장 변경을 확인하고 변경을 계속할 경우 true를 반환합니다. */
  readonly beforeChange: () => Promise<boolean>
  /** 저장한 작업 폴더 연결을 화면에 반영합니다. */
  readonly receive: (value: WorkspaceSession) => void | Promise<void>
}

/** 미저장 변경을 확인한 뒤 현재 채팅의 작업 폴더를 저장하고 표시합니다. */
export const createWorkspaceChanger = (options: CreateWorkspaceChangerOptions) => {
  const change = options.port.changeWorkspace
  if (change === undefined) {
    return undefined
  }
  return async (path: string): Promise<boolean> => {
    if (!(await options.beforeChange())) {
      return false
    }
    const connection = await change(path)
    await options.receive(connection)
    return true
  }
}
