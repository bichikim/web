import {type Accessor, createMemo, createSignal, onMount} from 'solid-js'
import type {AiJobClient} from './client'
import type {AiJobSession} from './create-ai-job-session'
import type {StoredAiTextJob} from './storage'
import {getClientErrorCode} from './status'
import {SERVER_AI_RELEASED} from './release'

export type AiTextExecutionMode = 'local' | 'server'
export type AiTextAccessStatus = 'checking' | 'available' | 'unavailable' | 'error'

export interface UseAiTextAccessProps {
  readonly client: AiJobClient
  readonly session: AiJobSession
  readonly isBusy: Accessor<boolean>
  readonly onError: (message: string | null) => void
  readonly onRestore: (saved: StoredAiTextJob) => Promise<void>
}

export const useAiTextAccess = (props: UseAiTextAccessProps) => {
  const [accessStatus, setAccessStatus] = createSignal<AiTextAccessStatus>('checking')
  const [executionMode, setExecutionModeSignal] = createSignal<AiTextExecutionMode>('local')
  const [accessMessage, setAccessMessage] = createSignal<string | null>(null)
  const serverAvailable = createMemo(() => accessStatus() === 'available')
  const setExecutionMode = (nextMode: AiTextExecutionMode) => {
    if (nextMode === 'server' && !serverAvailable()) {
      props.onError(accessMessage())
      return
    }
    setExecutionModeSignal(nextMode)
    if (nextMode === 'local' && !props.isBusy()) {
      props.onError(null)
    }
  }
  const initialize = async () => {
    const saved = props.session.restore()
    if (saved !== null) {
      setExecutionModeSignal('server')
      await props.onRestore(saved)
    }

    try {
      const access = await props.client.readTextAccess()
      if (props.session.isDisposed()) {
        return
      }
      setAccessStatus(access.available ? 'available' : 'unavailable')
      setAccessMessage(
        access.available
          ? null
          : '서버 Luna는 Pomo AI 구독자만 사용할 수 있어요. 기기 실행은 계속 사용할 수 있습니다.',
      )
      if (access.available && saved === null) {
        setExecutionModeSignal('server')
      }
    } catch (error: unknown) {
      if (props.session.isDisposed()) {
        return
      }
      const unavailable = ['unauthorized', 'ai_access_unavailable'].includes(
        getClientErrorCode(error) ?? '',
      )
      setAccessStatus(unavailable ? 'unavailable' : 'error')
      setAccessMessage(
        unavailable
          ? '서버 Luna는 Pomo AI 구독자만 사용할 수 있어요. 기기 실행은 계속 사용할 수 있습니다.'
          : '서버 Luna 사용 가능 여부를 확인하지 못했어요. 잠시 후 다시 확인해 주세요.',
      )
    }
  }

  onMount(() => {
    // 출시 전에는 저장된 job 복원과 권한 조회도 실행하지 않는다.
    if (!SERVER_AI_RELEASED) {
      setAccessStatus('unavailable')
      return
    }
    initialize().catch(() => undefined)
  })

  return {accessMessage, accessStatus, executionMode, serverAvailable, setExecutionMode}
}
