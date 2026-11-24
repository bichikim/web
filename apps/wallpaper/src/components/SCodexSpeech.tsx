import {localizeMessage, text as uiText} from '../features/localization'

import {SSpeechVoiceActivity} from './SSpeechVoiceActivity'
import type {VoiceStatus} from '../features/voice/readout'
import {createSignal, type JSX, Show} from 'solid-js'
import {
  type ChatTone,
  type CodexActivity,
  type CodexApproval,
  type CodexPort,
  type CodexQuestionRequest,
  useChatOpen,
} from '../features/codex'
import {type SpeechAnchor, type SpeechPoint, useSpeechMinimumHeight} from '../features/speech'
import {SCodexSpeechContent} from './SCodexSpeechContent'
import {SSpeechFrame} from './SSpeechFrame'

interface SCodexSpeechProps {
  /** Additional header controls; omission leaves the standard actions. */
  readonly headerActions?: JSX.Element
  readonly onRecording?: (active: boolean) => void
  readonly voiceNotice?: string
  readonly voiceState?: VoiceStatus
  readonly onVoiceToggle?: () => void
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
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const requests = () => [props.questions, props.approvals]
  const minimumHeight = useSpeechMinimumHeight({
    content: () => [props.activity, requests(), props.voiceNotice, chat.error()],
    element,
  })
  const caption = () => props.chatLabel ?? props.activity.title ?? 'Codex'
  return (
    <aside
      role="status"
      aria-label={uiText('Codex 작업 알림')}
      aria-live="polite"
      aria-atomic="true"
      data-tone={props.tone}
      class="wallpaper-speech pointer-events-none relative rounded-xl text-stone-800"
      classList={{'wallpaper-speech-stacked': props.stacked}}
    >
      <SSpeechFrame
        tone={props.tone}
        target={props.selected === false ? undefined : props.target}
        anchor={props.anchor}
        moving={props.moving}
        layout={props.layout}
      />
      <div
        ref={setElement}
        style={minimumHeight()}
        class="wallpaper-speech-contents pointer-events-auto relative box-border flex
        flex-col gap-1 rounded-xl
        border border-solid border-transparent p-3"
        classList={{'wallpaper-speech-contents-top': props.anchor === 'top'}}
      >
        <div
          class="relative -mx-3 -mt-3 -mb-1 flex shrink-0 items-center gap-1 overflow-clip
        rounded-t-[11px] px-3 pt-2 pb-1 text-xs font-medium"
        >
          <Show when={props.onSelect}>
            {(select) => (
              <button
                type="button"
                aria-label={uiText('채팅 {value0} 선택', {value0: String(caption())})}
                data-speech-drag-handle
                aria-pressed={props.selected ?? false}
                title={
                  props.onOpen === undefined
                    ? caption()
                    : uiText('{value0} · 더블클릭하여 Codex에서 열기', {value0: String(caption())})
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
          {props.headerActions}
          <Show when={props.onOpen}>
            <button
              type="button"
              aria-label={uiText('{value0} Codex에서 열기', {value0: String(caption())})}
              title={uiText('Codex에서 열기')}
              disabled={chat.busy()}
              onClick={chat.open}
              class="wallpaper-speech-action text-stone-600"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                class="h-4 w-4 fill-none stroke-current [stroke-width:1.75]
                [stroke-linecap:round] [stroke-linejoin:round]"
              >
                <path d="M14 3h7v7m0-7L10 14m0-10H4v16h16v-6" />
              </svg>
            </button>
          </Show>
          <Show when={props.onDismiss}>
            {(dismiss) => (
              <button
                type="button"
                aria-label={uiText('{value0} 알림 닫기', {value0: String(caption())})}
                title={uiText('알림 닫기')}
                class="wallpaper-speech-action text-stone-600"
                onClick={dismiss()}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  class="pointer-events-none h-4 w-4 fill-none stroke-current
                  [stroke-width:1.75] [stroke-linecap:round]"
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
              {localizeMessage(message() ?? '')}
            </p>
          )}
        </Show>
        <SCodexSpeechContent
          onRecording={props.onRecording}
          activity={props.activity}
          wrap={props.wrap}
          approvals={props.approvals}
          questions={props.questions}
          caption={caption()}
          inactive={props.selected === false}
          footerActions={
            <SSpeechVoiceActivity state={props.voiceState} onToggle={props.onVoiceToggle} />
          }
        />
        <Show when={props.voiceNotice}>
          {(notice) => (
            <div class="flex shrink-0 items-center gap-2 text-[11px] text-stone-500">
              <span role="status" class="min-w-0 flex-1">
                {localizeMessage(notice() ?? '')}
              </span>
            </div>
          )}
        </Show>
      </div>
    </aside>
  )
}
