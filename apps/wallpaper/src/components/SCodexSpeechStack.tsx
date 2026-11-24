import {text as uiText} from '../features/localization'
import type {VoiceStatus} from '../features/voice/readout'
import {createSignal, For, onCleanup, Show} from 'solid-js'
import {
  chatTone,
  type CodexActivity,
  type CodexApproval,
  type CodexPort,
  type CodexQuestionRequest,
} from '../features/codex'
import {type SpeechAnchor, type SpeechPoint, useSpeechStack} from '../features/speech'
import {SCodexSpeech} from './SCodexSpeech'
import {CHARACTER_SPEECH_ID, type useCharacterChat} from '../features/conversation'
import {SCharacterSpeech} from './SCharacterSpeech'
import {SSpeechOverflow} from './SSpeechOverflow'

interface SCodexSpeechStackProps {
  readonly dragging?: boolean
  readonly character?: ReturnType<typeof useCharacterChat>
  readonly onRecording?: (active: boolean) => void
  readonly maxHeight?: number
  readonly wrap?: boolean
  readonly anchor?: SpeechAnchor
  readonly questions?: readonly CodexQuestionRequest[]
  readonly approvals?: readonly CodexApproval[]
  readonly activities?: readonly CodexActivity[]
  readonly target?: SpeechPoint
  readonly layout?: number
  readonly onDismiss?: (activity: CodexActivity) => void
  readonly onOpen?: CodexPort['openChat']
  readonly onSelected?: (id: string | null) => void
  readonly voiceNotice?: string
  readonly voiceState?: VoiceStatus
  readonly onVoiceToggle?: () => void
  readonly onMoving?: (moving: boolean) => void
}
export const SCodexSpeechStack = (props: SCodexSpeechStackProps) => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const [cards, setCards] = createSignal<ReadonlyMap<string, HTMLElement>>(new Map())
  const stack = useSpeechStack({
    activities: () => props.activities,
    anchor: () => props.anchor ?? 'bottom',
    cards,
    character: () => props.character,
    dragging: () => props.dragging ?? false,
    element,
    layout: () => props.layout,
    maxHeight: () => props.maxHeight,
    onMoving: (active) => props.onMoving?.(active),
    onRecording: (active) => props.onRecording?.(active),
    onSelected: (id) => props.onSelected?.(id),
    target: () => props.target,
  })
  return (
    <div
      ref={setElement}
      role="list"
      aria-label={props.character === undefined ? uiText('Codex 채팅 알림') : uiText('대화 말풍선')}
      data-moving={stack.active() !== null}
      data-sizing={stack.heightSource()}
      onPointerEnter={stack.enter}
      onPointerMove={stack.move}
      onPointerLeave={stack.leave}
      onPointerDown={stack.press}
      onFocusIn={stack.focus}
      onFocusOut={stack.blur}
      onKeyDown={stack.keyboard}
      class="pointer-events-none isolate grid [grid-template-rows:var(--front-height)]
      [padding-bottom:var(--stack-offset)]
      transition-[grid-template-rows] duration-200 [transition-timing-function:cubic-bezier(.22,.8,.25,1)]
      motion-reduce:transition-none data-[moving=true]:transition-none data-[sizing=constraint]:transition-none"
      style={{
        '--front-height': stack.rowHeight(),
        '--speech-limit': `${stack.heightLimit()}px`,
        '--stack-offset': `${stack.offset()}px`,
      }}
    >
      <For each={stack.painting()}>
        {(id) => {
          const selected = () => id === (stack.active() ?? stack.order()[0])
          const covered = () => stack.active() === null && !selected()
          const hidden = () => !selected() && (!stack.expanded() || !stack.previews().includes(id))
          const voiceState = () => (selected() ? props.voiceState : undefined)
          const voiceNotice = () => (selected() ? props.voiceNotice : undefined)
          const actions = (
            <Show when={selected() && stack.overflowItems().length > 0}>
              <SSpeechOverflow
                items={stack.overflowItems()}
                onSelect={stack.selectOverflow}
                onOpenChange={stack.browseChanged}
              />
            </Show>
          )
          onCleanup(() => setCards((value) => new Map([...value].filter(([key]) => key !== id))))
          return (
            <div
              ref={(card) => setCards((value) => new Map(value).set(id, card))}
              role="listitem"
              aria-posinset={stack.order().indexOf(id) + 1}
              aria-setsize={stack.order().length}
              data-speech-id={id}
              data-moving={stack.active() !== null}
              data-anchor={stack.anchor()}
              data-preview-hidden={hidden()}
              aria-hidden={hidden() || undefined}
              inert={hidden()}
              hidden={!selected() && !stack.previews().includes(id)}
              class="pointer-events-none relative min-w-0 self-end data-[anchor=top]:self-start rounded-xl
              [grid-area:1/1] [transform:translateY(var(--speech-y))]
              wallpaper-speech-motion duration-200
              [transition-timing-function:cubic-bezier(.22,.8,.25,1)]
              data-[moving=true]:transition-none data-[sizing=constraint]:transition-none
              motion-reduce:transition-none data-[moving=true]:[will-change:transform,box-shadow]"
              data-sizing={stack.heightSource()}
              style={{
                '--speech-depth': `${stack.pose(id).depth}`,
                '--speech-height': `${stack.pose(id).height}px`,
                '--speech-reveal': `${stack.pose(id).reveal}`,
                '--speech-y': `${stack.pose(id).y}px`,
              }}
            >
              <div
                class="wallpaper-speech-preview"
                classList={{
                  'wallpaper-speech-covered': stack.anchor() !== 'top' && covered(),
                  'wallpaper-speech-covered-top': stack.anchor() === 'top' && covered(),
                }}
              >
                <Show when={id === CHARACTER_SPEECH_ID && props.character}>
                  {(character) => (
                    <SCharacterSpeech
                      chat={character()}
                      headerActions={actions}
                      anchor={stack.anchor()}
                      moving={stack.active() !== null}
                      selected={selected()}
                      onSelect={() => stack.select(id)}
                      onRecording={(active) => stack.record(id, active)}
                      voiceState={voiceState()}
                      voiceNotice={voiceNotice()}
                      onVoiceToggle={selected() ? props.onVoiceToggle : undefined}
                      target={props.target}
                      wrap={props.wrap}
                      layout={(props.layout ?? 0) + stack.revision()}
                    />
                  )}
                </Show>
                <Show when={props.activities?.find((item) => item.sessionId === id)}>
                  {(activity) => (
                    <SCodexSpeech
                      onRecording={(active) => stack.record(id, active)}
                      anchor={stack.anchor()}
                      moving={stack.active() !== null}
                      stacked
                      activity={activity()}
                      headerActions={actions}
                      voiceState={voiceState()}
                      voiceNotice={voiceNotice()}
                      onVoiceToggle={selected() ? props.onVoiceToggle : undefined}
                      approvals={props.approvals?.filter((request) => request.sessionId === id)}
                      questions={props.questions?.filter((request) => request.sessionId === id)}
                      chatLabel={activity().title ?? uiText('새 채팅')}
                      wrap={props.wrap}
                      tone={chatTone(id)}
                      selected={selected()}
                      onSelect={() => stack.select(id)}
                      onOpen={props.onOpen}
                      onDismiss={props.onDismiss && (() => props.onDismiss?.(activity()))}
                      target={props.target}
                      layout={(props.layout ?? 0) + stack.revision()}
                    />
                  )}
                </Show>
              </div>
            </div>
          )
        }}
      </For>
    </div>
  )
}
