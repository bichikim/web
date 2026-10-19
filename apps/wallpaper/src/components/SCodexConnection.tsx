import {createSignal, Show} from 'solid-js'
import {useCodexNotifications} from '../features/codex'
import {SCodexConnectionManager} from './SCodexConnectionManager'

export const SCodexConnection = () => {
  const connection = useCodexNotifications()
  const [open, setOpen] = createSignal(false)
  const status = () => {
    if (!connection.available) {
      return '데스크톱 앱에서 연결 가능'
    }
    if (connection.loading()) {
      return '확인 중…'
    }
    if (connection.busy()) {
      return '설정 중…'
    }
    if (connection.error() !== null) {
      return '연결 확인 필요'
    }
    const value = connection.snapshot()
    return value.registered ? (value.received ? '연결됨' : '등록됨 · 수신 대기') : '연결 안 됨'
  }
  const handleOpen = async () => {
    setOpen(true)
    if (!connection.snapshot().registered) {
      await connection.connect()
      const value = connection.snapshot()
      if (value.registered && !value.questionsEnabled && connection.error() === null) {
        await connection.configureQuestions(true)
      }
    }
  }
  return (
    <>
      <section aria-label="AI 에이전트 연결" class="grid gap-2">
        <h2 class="m-0 text-[13px] font-medium text-stone-700">AI 에이전트 연결</h2>
        <div class="flex items-center gap-3 rounded-lg border border-solid border-stone-200 px-3 py-2">
          <span
            aria-hidden="true"
            class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5 fill-none stroke-current [stroke-width:1.6] [stroke-linecap:round] [stroke-linejoin:round]"
            >
              <path d="m9 7-5 5 5 5m6-10 5 5-5 5m-2-13-2 16" />
            </svg>
          </span>
          <div class="min-w-0 flex-1">
            <span class="text-[13px] font-medium text-stone-800">Codex</span>
            <span role="status" class="block text-xs text-stone-500">
              {status()}
            </span>
          </div>
          <button
            type="button"
            class="wallpaper-file-button"
            aria-label={connection.snapshot().registered ? 'Codex 관리' : 'Codex 연결'}
            disabled={!connection.available || connection.loading() || connection.busy()}
            onClick={handleOpen}
          >
            {connection.snapshot().registered ? '관리' : '연결'}
          </button>
        </div>
      </section>
      <Show when={open()}>
        <SCodexConnectionManager connection={connection} onClose={() => setOpen(false)} />
      </Show>
    </>
  )
}
