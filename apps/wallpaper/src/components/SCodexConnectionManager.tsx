import {createSignal, Show} from 'solid-js'
import type {useCodexNotifications} from '../features/codex'
import {SDialog} from './SDialog'
import {SCodexConnectionDiagnostics} from './SCodexConnectionDiagnostics'
import {SCodexVoiceConnection} from './SCodexVoiceConnection'

interface SCodexConnectionManagerProps {
  readonly connection: ReturnType<typeof useCodexNotifications>
  readonly onClose?: () => void
}

export const SCodexConnectionManager = (props: SCodexConnectionManagerProps) => {
  const [diagnostics, setDiagnostics] = createSignal(false)
  const snapshot = () => props.connection.snapshot()
  const disconnect = async () => {
    await props.connection.disconnect()
    if (!snapshot().registered) {
      props.onClose?.()
    }
  }
  const toggleQuestions = () => props.connection.configureQuestions(!snapshot().questionsEnabled)
  return (
    <SDialog title="Codex 연결 관리" onClose={props.onClose}>
      <div class="min-h-0 overflow-y-auto overscroll-contain px-4 py-1">
        <div
          role="group"
          aria-label="작업·응답 수신"
          class="flex items-center justify-between gap-3 border-0 border-b border-solid border-stone-200 py-3"
        >
          <h3 class="m-0 text-[13px] font-medium">작업·응답 수신</h3>
          <span class="text-xs text-stone-500">
            {snapshot().registered
              ? snapshot().received
                ? '연결됨'
                : '등록됨 · 수신 대기'
              : '연결 안 됨'}
          </span>
        </div>
        <div
          role="group"
          aria-label="승인 요청 처리"
          class="flex items-center justify-between gap-3 border-0 border-b border-solid border-stone-200 py-3"
        >
          <h3 class="m-0 text-[13px] font-medium">승인 요청 처리</h3>
          <Show
            when={snapshot().registered && snapshot().approvalEnabled}
            fallback={
              <button
                type="button"
                class="wallpaper-file-button"
                disabled={props.connection.busy() || !snapshot().registered}
                onClick={props.connection.connect}
              >
                승인 요청 연결
              </button>
            }
          >
            <span class="text-xs text-stone-500">등록됨</span>
          </Show>
        </div>
        <div
          role="group"
          aria-label="질문 답변"
          class="flex items-center justify-between gap-3 border-0 border-b border-solid border-stone-200 py-3"
        >
          <div class="grid gap-0.5">
            <h3 class="m-0 text-[13px] font-medium">질문 답변</h3>
            <span class="text-xs text-stone-500">
              {snapshot().questionsEnabled ? '등록됨' : '연결 안 됨'}
            </span>
          </div>
          <button
            type="button"
            class="wallpaper-file-button"
            disabled={props.connection.busy() || !snapshot().registered}
            onClick={toggleQuestions}
          >
            {snapshot().questionsEnabled ? '질문 연결 해제' : '질문 답변 연결'}
          </button>
        </div>
        <Show when={snapshot().registered && !snapshot().received}>
          <p class="my-3 text-xs text-stone-600">
            Codex 설정 → Hooks에서 ‘Poffo 작업 알림’을 검토·승인해 주세요.
          </p>
        </Show>
        <Show when={snapshot().questionsEnabled}>
          <p class="my-3 text-xs text-stone-500">
            질문 도구가 보이지 않으면 Codex를 다시 실행해 주세요.
          </p>
        </Show>
        <SCodexVoiceConnection />
        <Show when={props.connection.error()}>
          {(message) => (
            <p role="alert" class="mb-3 mt-0 text-xs text-red-700">
              {message()}
            </p>
          )}
        </Show>
        <Show when={diagnostics()}>
          <div class="pb-3">
            <SCodexConnectionDiagnostics
              snapshot={snapshot()}
              busy={props.connection.busy()}
              onRefresh={props.connection.refresh}
            />
          </div>
        </Show>
      </div>
      <footer
        class="flex shrink-0 items-center justify-between gap-3
        border-0 border-t border-solid border-stone-200 px-4 py-3"
      >
        <button
          type="button"
          class="wallpaper-file-button"
          aria-expanded={diagnostics()}
          onClick={() => setDiagnostics((value) => !value)}
        >
          연결 진단
        </button>
        <button
          type="button"
          class="wallpaper-file-button text-red-700"
          disabled={props.connection.busy() || !snapshot().registered}
          onClick={disconnect}
        >
          연결 해제
        </button>
      </footer>
    </SDialog>
  )
}
