import {For, Show} from 'solid-js'
import type {AgentSessionSummary} from '@/components/agent/types'

const PRE = 'm-0 whitespace-pre-wrap break-words font-mono text-[0.85rem] leading-[1.45]'

interface SessionsModalProperties {
  readonly isOpen: boolean
  readonly isLoading: boolean
  readonly sessions: readonly AgentSessionSummary[]
  readonly error: string | null
  readonly onClose: () => void
  readonly onSelectSession: (session: AgentSessionSummary) => void
}

export function SessionsModal(properties: SessionsModalProperties) {
  return (
    <Show
      when={properties.isOpen}
      children={
        <div class="fixed inset-0 z-40">
          <button
            type="button"
            class="absolute inset-0 bg-[#040a14]/70"
            aria-label="세션 목록 닫기"
            onClick={properties.onClose}
          />
          <section class="absolute left-1/2 top-[4.75rem] w-[min(720px,calc(100vw-1.5rem))] -translate-x-1/2 rounded-[12px] border border-[#2c3642] bg-[#0f1823] p-3">
            <h2 class="mt-0 mb-2 text-[0.9rem] font-[650]">세션 목록</h2>
            <Show when={properties.isLoading}>
              <p class="m-0 text-[0.86rem] text-[#8b99a8]">불러오는 중…</p>
            </Show>
            <Show when={properties.error !== null}>
              <pre class={`${PRE} mt-2 text-[#f3b0ba]`}>{properties.error!}</pre>
            </Show>
            <Show
              when={
                !properties.isLoading &&
                properties.error === null &&
                properties.sessions.length === 0
              }
            >
              <p class="m-0 text-[0.86rem] text-[#8b99a8]">조회된 세션이 없습니다.</p>
            </Show>
            <Show when={!properties.isLoading && properties.sessions.length > 0}>
              <div class="max-h-[56dvh] overflow-y-auto divide-y divide-[#243140] border border-[#2a3542] rounded-[10px]">
                <For each={properties.sessions}>
                  {(session) => (
                    <button
                      type="button"
                      class="w-full cursor-pointer appearance-none border-0 bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[#1a2430] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b8cff] focus-visible:outline-offset-[-2px]"
                      onClick={() => properties.onSelectSession(session)}
                    >
                      <h3 class="m-0 text-[0.88rem] font-[600] text-inherit">{session.title}</h3>
                      <p class="m-0 mt-1 text-[0.76rem] text-[#8b99a8]">{session.sessionId}</p>
                      <p class="m-0 mt-1 text-[0.76rem] text-[#8b99a8]">
                        {new Date(session.updatedAt).toLocaleString()}
                      </p>
                      <Show when={session.cwd !== null}>
                        <p class="m-0 mt-1 text-[0.74rem] text-[#7d8b9a] break-all">
                          {session.cwd}
                        </p>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </section>
        </div>
      }
    />
  )
}
