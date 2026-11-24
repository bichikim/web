import {localizeMessage, text as uiText} from '../features/localization'

import {createMemo, createSignal, type JSX, Show} from 'solid-js'
import type {useCharacterChat} from '../features/conversation'
import {type SpeechAnchor, type SpeechPoint, useSpeechMinimumHeight} from '../features/speech'
import type {VoiceStatus} from '../features/voice/readout'
import {SSpeechFrame} from './SSpeechFrame'
import {SSpeechMarkdown} from './SSpeechMarkdown'
import {SSpeechComposer} from './SSpeechComposer'
import {SSpeechVoiceActivity} from './SSpeechVoiceActivity'

interface SCharacterSpeechProps {
  /** Additional header controls; omission leaves the standard actions. */
  readonly headerActions?: JSX.Element
  readonly chat: ReturnType<typeof useCharacterChat>
  readonly selected?: boolean
  readonly moving?: boolean
  readonly anchor?: SpeechAnchor
  readonly target?: SpeechPoint
  readonly layout?: number
  readonly wrap?: boolean
  readonly voiceState?: VoiceStatus
  readonly voiceNotice?: string
  readonly onSelect?: () => void
  readonly onRecording?: (active: boolean) => void
  readonly onVoiceToggle?: () => void
}
export const SCharacterSpeech = (props: SCharacterSpeechProps) => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const voiceBusy = createMemo(() => props.voiceState !== undefined && props.voiceState !== 'idle')
  const minimumHeight = useSpeechMinimumHeight({
    content: () => [
      props.chat.response(),
      props.chat.busy(),
      props.chat.error(),
      props.voiceNotice,
    ],
    element,
  })
  return (
    <aside
      role="status"
      aria-label={uiText('캐릭터 대화')}
      aria-live="polite"
      data-tone="teal"
      class="wallpaper-speech wallpaper-speech-stacked pointer-events-none relative rounded-xl text-stone-800"
    >
      <SSpeechFrame
        tone="teal"
        anchor={props.anchor}
        target={props.selected === false ? undefined : props.target}
        moving={props.moving}
        layout={props.layout}
      />
      <div
        ref={setElement}
        style={minimumHeight()}
        class="wallpaper-speech-contents pointer-events-auto relative box-border flex flex-col gap-1
      rounded-xl border border-solid border-transparent p-3"
        classList={{'wallpaper-speech-contents-top': props.anchor === 'top'}}
      >
        <div
          class="relative -mx-3 -mt-3 -mb-1 flex shrink-0 items-center gap-1 overflow-clip rounded-t-[11px]
      px-3 pt-2 pb-1 text-xs font-medium"
        >
          <button
            type="button"
            aria-label={uiText('캐릭터 대화 선택')}
            aria-pressed={props.selected ?? false}
            data-speech-drag-handle
            class="absolute inset-0 cursor-pointer appearance-none rounded-t-xl border-0 bg-transparent p-0
      [[data-draggable=true]_&]:cursor-grab [[data-dragging=true]_&]:cursor-grabbing touch-none
      focus-visible:outline-2 focus-visible:outline-blue-700 [outline-offset:-2px]"
            onClick={() => props.onSelect?.()}
          />
          <span class="pointer-events-none min-w-0 flex-1 truncate">{uiText('캐릭터와 대화')}</span>
          {props.headerActions}
        </div>
        <div inert={props.selected === false} class="flex min-h-0 min-w-0 flex-col gap-1">
          <Show when={props.chat.response()}>
            {(response) => (
              <div
                data-speech-body
                role="region"
                aria-label={uiText('캐릭터 응답')}
                tabIndex={0}
                data-wrap={props.wrap ?? true}
                class="[min-height:var(--speech-body-minimum,0px)] min-w-0 overflow-auto
                overscroll-contain text-[13px] leading-5
      data-[wrap=true]:overflow-x-hidden"
              >
                <SSpeechMarkdown source={response()} wrap={props.wrap ?? true} />
              </div>
            )}
          </Show>
          <Show when={props.onVoiceToggle || props.chat.busy()}>
            <footer class="mt-1 flex min-h-6 shrink-0 items-center justify-end gap-1.5 text-[11px] leading-4">
              <SSpeechVoiceActivity state={props.voiceState} onToggle={props.onVoiceToggle} />
              <Show when={props.chat.busy()}>
                <span class="whitespace-nowrap font-medium text-teal-800">{uiText('답변 중')}</span>
              </Show>
            </footer>
          </Show>
          <Show when={props.chat.busy()}>
            <div class="flex shrink-0 items-center gap-2 text-xs text-stone-600">
              <span role="status" class="min-w-0 flex-1">
                {localizeMessage(props.chat.notice() ?? '')}
              </span>
              <button
                type="button"
                class="wallpaper-file-button"
                onClick={() => props.chat.cancel()}
              >
                {uiText('취소')}
              </button>
            </div>
          </Show>
          <SSpeechComposer
            continuous
            voiceBusy={voiceBusy()}
            value={props.chat.draft()}
            disabled={props.chat.busy()}
            active={props.selected}
            onEdit={props.chat.edit}
            onSend={props.chat.send}
            onInterrupt={props.chat.interrupt}
            onRecording={props.onRecording}
            error={props.chat.error()}
          />
          <Show when={props.voiceNotice}>
            {(notice) => (
              <div class="flex shrink-0 items-center gap-2 text-[11px] text-stone-600">
                <span class="min-w-0 flex-1">{localizeMessage(notice() ?? '')}</span>
              </div>
            )}
          </Show>
        </div>
      </div>
    </aside>
  )
}
