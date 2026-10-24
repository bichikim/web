import {createMemo, createSignal} from 'solid-js'
import {
  type PluginUpdate,
  pluginUpdateErrorSchema,
  pluginUpdateSchema,
  UPDATE_INSTALL_TIMEOUT_MS,
} from '../shared/plugin-updates'
import type {ViewerPort} from './types'

type UpdateOperation = 'check' | 'install'
interface IdleUpdate {
  readonly status: 'idle'
}
interface PendingUpdate {
  readonly status: 'pending'
  readonly operation: UpdateOperation
}
interface FailedUpdate {
  readonly status: 'failed'
  readonly reason: UpdateOperation | 'busy'
}
type UpdateState = IdleUpdate | PendingUpdate | FailedUpdate

/** 확인·설치 요청의 중복 실행을 막고 재시도와 재시작 안내 상태를 유지한다. */
export const usePluginUpdates = (port: Pick<ViewerPort, 'call'>) => {
  const [release, setRelease] = createSignal<PluginUpdate | null>(null)
  const [state, setState] = createSignal<UpdateState>({status: 'idle'})
  const pending = createMemo(() => {
    const current = state()
    return current.status === 'pending' ? current.operation : null
  })
  const failure = createMemo(() => {
    const current = state()
    return current.status === 'failed' ? current.reason : null
  })
  const run = async (operation: UpdateOperation): Promise<void> => {
    const current = release()
    if (pending() !== null || current?.status === 'installed') {
      return
    }
    if (operation === 'install' && current?.status !== 'available') {
      return
    }
    setState({operation, status: 'pending'})
    try {
      const result =
        operation === 'check'
          ? await port.call('code.update-check', {})
          : await port.call(
              'code.update-install',
              {version: current!.latest},
              {timeout: UPDATE_INSTALL_TIMEOUT_MS},
            )
      const parsed = pluginUpdateSchema.safeParse(result.structuredContent)
      if (result.isError || !parsed.success) {
        const error = pluginUpdateErrorSchema.safeParse(result.structuredContent)
        const reason =
          error.success && error.data.code === 'update-in-progress' ? 'busy' : operation
        setState({reason, status: 'failed'})
        return
      }
      setRelease(parsed.data)
      setState({status: 'idle'})
    } catch {
      setState({reason: operation, status: 'failed'})
    }
  }
  return {check: () => run('check'), failure, install: () => run('install'), pending, release}
}
