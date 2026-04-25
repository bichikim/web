import {Show} from 'solid-js'
import IconSettings from '~icons/solar/settings-bold-duotone'

const BTN_SHARED = [
  'appearance-none',
  'rounded-[10px]',
  'border',
  'py-[0.55rem]',
  'px-4',
  'font-inherit',
  'cursor-pointer',
  'disabled:opacity-45',
  'disabled:cursor-not-allowed',
].join(' ')

const BTN_ICON = [
  BTN_SHARED,
  'border-[#354253]',
  'bg-[#111925]',
  'text-[#9bb0c7]',
  'px-2.5',
  'py-[0.45rem]',
].join(' ')

const BTN_NEW_CHAT = [
  BTN_SHARED,
  'border-[#354253]',
  'bg-[#17202c]',
  'text-inherit',
  'text-[0.78rem]',
  'py-[0.42rem]',
  'px-3',
].join(' ')

interface AgentHeaderProperties {
  readonly sessionTitle: string | null
  readonly sessionId: string | null
  readonly hasMessages: boolean
  readonly isRunning: boolean
  readonly isSessionsOpen: boolean
  readonly isSettingsOpen: boolean
  readonly onClickNewChat: () => void
  readonly onClickSessions: () => void
  readonly onClickSettings: () => void
}

export function AgentHeader(properties: AgentHeaderProperties) {
  const titleText = () =>
    properties.sessionTitle !== null && properties.sessionTitle !== ''
      ? properties.sessionTitle
      : '—'
  const idText = () =>
    properties.sessionId !== null && properties.sessionId !== '' ? properties.sessionId : '—'

  return (
    <header class="shrink-0 pt-4 pb-3 mb-2 border-b border-[#273244]">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex-1 pr-2">
          <h1 class="m-0 text-xl font-[650]">CLI Agent</h1>
          <p
            class="m-0 mt-1 text-[0.72rem] leading-snug text-[#8b99a8] truncate"
            title={titleText()}
          >
            <span class="text-[#6c7a8a]">제목</span> {titleText()}
          </p>
          <p
            class="m-0 mt-0.5 text-[0.72rem] leading-snug text-[#8b99a8] truncate font-mono"
            title={idText()}
          >
            <span class="text-[#6c7a8a]">세션</span> {idText()}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Show when={properties.hasMessages}>
            <button
              type="button"
              class={BTN_NEW_CHAT}
              aria-label="새 대화"
              disabled={properties.isRunning}
              onClick={properties.onClickNewChat}
            >
              새 대화
            </button>
          </Show>
          <button
            type="button"
            class={BTN_ICON}
            aria-label="세션 목록"
            aria-expanded={properties.isSessionsOpen}
            onClick={properties.onClickSessions}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 7h14M5 12h14M5 17h14"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class={BTN_ICON}
            aria-label="설정"
            aria-expanded={properties.isSettingsOpen}
            onClick={properties.onClickSettings}
          >
            <IconSettings width={18} height={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
