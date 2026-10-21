import {For, Show} from 'solid-js'
import {codexEventLabel, codexPhaseLabel, type CodexSnapshot} from '../features/codex'

interface SCodexConnectionDiagnosticsProps {
  readonly snapshot: CodexSnapshot
  readonly busy?: boolean
  readonly onRefresh?: () => void
}
export const SCodexConnectionDiagnostics = (props: SCodexConnectionDiagnosticsProps) => (
  <section
    aria-label="연결 진단"
    class="grid gap-3 border-0 border-t border-solid border-stone-200 pt-3 text-xs"
  >
    <div class="flex items-center justify-between gap-2">
      <h3 class="m-0 text-[13px] font-medium">연결 진단</h3>
      <button
        type="button"
        class="wallpaper-file-button"
        disabled={props.busy}
        onClick={() => props.onRefresh?.()}
      >
        상태 확인
      </button>
    </div>
    <span class="text-stone-500">
      {props.snapshot.activity === null
        ? '아직 수신한 작업이 없어요.'
        : `최근 수신 ${new Date(props.snapshot.activity.receivedAt).toLocaleTimeString()}`}
    </span>
    <Show when={props.snapshot.sessions.length > 0}>
      <ul aria-label="채팅별 마지막 알림" class="m-0 grid list-none gap-2 p-0">
        <For each={props.snapshot.sessions}>
          {(session) => (
            <li class="flex min-w-0 items-center justify-between gap-3">
              <span title={session.sessionId} class="truncate">
                {session.title ?? '새 채팅'}
              </span>
              <span class="shrink-0 text-stone-500">{codexPhaseLabel(session.phase)}</span>
            </li>
          )}
        </For>
      </ul>
    </Show>
    <Show when={props.snapshot.recent.length > 0}>
      <ol aria-label="Codex 알림 수신 기록" class="m-0 max-h-40 list-none overflow-auto p-0">
        <For each={props.snapshot.recent.toReversed()}>
          {(event) => (
            <li class="grid grid-cols-[auto_1fr] gap-x-3 border-0 border-b border-solid border-stone-200 py-2">
              <time class="text-stone-500">{new Date(event.emitted_at).toLocaleTimeString()}</time>
              <span>{codexEventLabel(event.hook_event_name)}</span>
              <Show when={event.tool_name}>
                <span class="col-start-2 truncate text-stone-500">{event.tool_name}</span>
              </Show>
            </li>
          )}
        </For>
      </ol>
    </Show>
  </section>
)
