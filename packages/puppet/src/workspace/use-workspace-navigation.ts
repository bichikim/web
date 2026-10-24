import {type Accessor, batch, createEffect, createSignal, on, onCleanup, untrack} from 'solid-js'
import {useDeferredValue} from '../use-deferred-value'
import type {WorkspaceMode} from './types'

interface WorkspaceNavigationOptions {
  /** 실제로 표시 중인 작업 공간. 외부 경로 변경 시 대기 중인 선택을 취소한다. */
  readonly current: Accessor<WorkspaceMode>
  /** 선택 표시가 그려진 뒤 실행한다. signal이 중단되면 저장 후에도 화면을 바꾸지 않는다. */
  readonly onNavigate: (mode: WorkspaceMode, signal: AbortSignal) => void | Promise<void>
}

interface WorkspaceNavigationState {
  readonly dismissError: () => void
  readonly error: Accessor<string | null>
  readonly select: (mode: WorkspaceMode) => void
  readonly selected: Accessor<WorkspaceMode>
}

/** 선택을 즉시 표시하고 화면 전환은 다음 그리기 이후에 실행한다. 마지막 요청만 유지한다. */
export const useWorkspaceNavigation = (
  options: WorkspaceNavigationOptions,
): WorkspaceNavigationState => {
  const [error, setError] = createSignal<string | null>(null)
  let request: AbortController | null = null
  const cancel = () => {
    request?.abort()
    request = null
  }
  const navigate = async (mode: WorkspaceMode) => {
    const active = request
    if (active === null || active.signal.aborted) {
      return
    }
    try {
      await options.onNavigate(mode, active.signal)
    } catch (cause) {
      if (!active.signal.aborted) {
        setError(cause instanceof Error ? cause.message : '화면을 전환하지 못했습니다.')
      }
    } finally {
      if (request === active) {
        request = null
        selection.reset(options.current())
      }
    }
  }
  const selection = useDeferredValue({
    initialValue: untrack(options.current),
    onCommit: navigate,
  })
  const reset = () => {
    cancel()
    selection.reset(options.current())
  }
  createEffect(on(options.current, reset, {defer: true}))
  onCleanup(cancel)
  const select = (mode: WorkspaceMode) => {
    if (mode === selection.value()) {
      return
    }
    cancel()
    const current = options.current()
    batch(() => {
      setError(null)
      selection.reset(current)
      if (mode !== current) {
        request = new AbortController()
        selection.select(mode)
      }
    })
  }
  return {dismissError: () => setError(null), error, select, selected: selection.value}
}
