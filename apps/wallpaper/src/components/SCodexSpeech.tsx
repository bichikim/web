import {SSpeechVoiceActivity} from './SSpeechVoiceActivity'
import type {VoiceStatus} from '../features/voice/readout'
import {Show} from 'solid-js'
import {
  type ChatTone,
  type CodexActivity,
  type CodexApproval,
  codexPhaseLabel,
  type CodexPort,
  type CodexQuestionRequest,
  useChatOpen,
} from '../features/codex'
import {type SpeechAnchor, type SpeechPoint} from '../features/speech'
import {SCodexSpeechContent} from './SCodexSpeechContent'
import {SSpeechFrame} from './SSpeechFrame'

interface SCodexSpeechProps {
  readonly voiceNotice?: string
  readonly voiceState?: VoiceStatus
  readonly onVoiceRetry?: () => void
  readonly questions?: readonly CodexQuestionRequest[]
  readonly approvals?: readonly CodexApproval[]
  readonly activity: CodexActivity
  readonly wrap?: boolean
  readonly target?: SpeechPoint
  readonly anchor?: SpeechAnchor
  readonly moving?: boolean
  readonly stacked?: boolean
  readonly chatLabel?: string
  readonly layout?: number
  readonly tone?: ChatTone
  readonly selected?: boolean
  readonly onSelect?: () => void
  readonly onOpen?: CodexPort['openChat']
  readonly onDismiss?: () => void
}
export const SCodexSpeech = (props: SCodexSpeechProps) => {
  const chat = useChatOpen({open: () => props.onOpen, sessionId: () => props.activity.sessionId})
  const caption = () => props.chatLabel ?? props.activity.title ?? 'Codex'
  return (
    <aside
      role="status"
      aria-label="Codex 작업 알림"
      aria-live="polite"
      aria-atomic="true"
      data-tone={props.tone}
      class="wallpaper-speech pointer-events-none relative rounded-xl text-stone-800"
      classList={{'wallpaper-speech-stacked': props.stacked}}
    >
      <SSpeechFrame
        tone={props.tone}
        target={props.target}
        anchor={props.anchor}
        moving={props.moving}
        layout={props.layout}
      />
      <div
        class="wallpaper-speech-contents pointer-events-auto relative box-border flex min-h-0
        flex-col gap-1 rounded-xl [max-height:var(--speech-limit,568px)]
        border border-solid border-transparent p-3"
        classList={{'wallpaper-speech-contents-top': props.anchor === 'top'}}
      >
        <div
          class="relative -mx-3 -mt-3 -mb-1 flex shrink-0 items-center gap-2 overflow-clip
        rounded-t-[11px] px-3 pt-3 pb-1 text-xs font-medium"
        >
          <Show when={props.onSelect}>
            {(select) => (
              <button
                type="button"
                aria-label={`채팅 ${caption()} 선택`}
                data-speech-drag-handle
                aria-pressed={props.selected ?? false}
                title={
                  props.onOpen === undefined
                    ? caption()
                    : `${caption()} · 더블클릭하여 Codex에서 열기`
                }
                class="absolute inset-0 cursor-pointer appearance-none rounded-t-xl border-0 bg-transparent p-0
              [[data-draggable=true]_&]:cursor-grab [[data-dragging=true]_&]:cursor-grabbing touch-none
              focus-visible:outline-2 focus-visible:outline-blue-700 [outline-offset:-2px]"
                onClick={select()}
                onDblClick={chat.open}
              />
            )}
          </Show>
          <span class="pointer-events-none min-w-0 flex-1 truncate" title={caption()}>
            {caption()}
          </span>
          <span
            class="pointer-events-none shrink-0 rounded px-1.5 py-0.5"
            classList={{
              'bg-amber-100 text-amber-900': props.activity.phase === 'approval',
              'bg-blue-50 text-blue-800': props.activity.phase !== 'approval',
            }}
          >
            {codexPhaseLabel(props.activity.phase)}
          </span>
          <SSpeechVoiceActivity state={props.voiceState} />
          <Show when={props.onOpen}>
            <button
              type="button"
              aria-label={`${caption()} Codex에서 열기`}
              title="Codex에서 열기"
              disabled={chat.busy()}
              onClick={chat.open}
              class="relative grid h-5 w-5 shrink-0 cursor-pointer place-items-center appearance-none rounded
              border-0 bg-transparent p-0 text-stone-500 hover:bg-black/5 disabled:opacity-50
              focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                class="h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
              >
                <path d="M14 3h7v7m0-7L10 14m0-10H4v16h16v-6" />
              </svg>
            </button>
          </Show>
          <Show when={props.onDismiss}>
            {(dismiss) => (
              <button
                type="button"
                aria-label={`${caption()} 알림 닫기`}
                class="relative grid h-5 w-5 shrink-0 cursor-pointer place-items-center appearance-none rounded
              border-0 bg-transparent p-0 leading-none text-stone-500 hover:bg-black/5
              focus-visible:outline-2 focus-visible:outline-blue-700"
                onClick={dismiss()}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  class="pointer-events-none h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round]"
                >
                  <path d="M6 6 18 18M18 6 6 18" />
                </svg>
              </button>
            )}
          </Show>
        </div>
        <Show when={chat.error()}>
          {(message) => (
            <p role="alert" class="m-0 text-xs text-red-700">
              {message()}
            </p>
          )}
        </Show>
        <SCodexSpeechContent
          activity={props.activity}
          wrap={props.wrap}
          approvals={props.approvals}
          questions={props.questions}
          caption={caption()}
          inactive={props.selected === false}
        />
        <Show when={props.voiceNotice}>
          {(notice) => (
            <div class="flex shrink-0 items-center gap-2 text-[11px] text-stone-500">
              <span role="status" class="min-w-0 flex-1">
                {notice()}
              </span>
              <Show when={props.onVoiceRetry}>
                {(retry) => (
                  <button type="button" class="wallpaper-file-button shrink-0" onClick={retry()}>
                    다시 읽기
                  </button>
                )}
              </Show>
            </div>
          )}
        </Show>
      </div>
    </aside>
  )
}
