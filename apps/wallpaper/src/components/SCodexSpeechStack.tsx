import type {VoiceStatus} from '../features/voice/readout'
import {createEffect, createMemo, createSignal, For, on, onCleanup, Show, untrack} from 'solid-js'
import {
  chatTone,
  type CodexActivity,
  type CodexApproval,
  type CodexQuestionRequest,
} from '../features/codex'
import {
  COVERED_HEIGHT,
  type SpeechAnchor,
  type SpeechPoint,
  type SpeechRect,
  useElementRect,
  useOverlapStack,
} from '../features/speech'
import {SCodexSpeech} from './SCodexSpeech'

const FRAME_PADDING = 72
const DEFAULT_FRAME_HEIGHT = 640
const MINIMUM_CARD_HEIGHT = 160
const MEASUREMENT_PRECISION = 1000
const measuredHeight = (rect: SpeechRect | null) =>
  rect === null
    ? 'auto'
    : `${Math.round(rect.height * MEASUREMENT_PRECISION) / MEASUREMENT_PRECISION}px`

interface SCodexSpeechStackProps {
  readonly maxHeight?: number
  readonly wrap?: boolean
  readonly anchor?: SpeechAnchor
  readonly questions?: readonly CodexQuestionRequest[]
  readonly approvals?: readonly CodexApproval[]
  readonly activities?: readonly CodexActivity[]
  readonly target?: SpeechPoint
  readonly layout?: number
  readonly onDismiss?: (activity: CodexActivity) => void
  readonly onSelected?: (id: string | null) => void
  readonly voiceNotice?: string
  readonly voiceState?: VoiceStatus
  readonly onVoiceRetry?: () => void
  readonly onMoving?: (moving: boolean) => void
}
export const SCodexSpeechStack = (props: SCodexSpeechStackProps) => {
  const [element, setElement] = createSignal<HTMLDivElement | null>(null)
  const [cards, setCards] = createSignal<ReadonlyMap<string, HTMLElement>>(new Map())
  const ids = createMemo(() => props.activities?.map((item) => item.sessionId) ?? [])
  const [rowHeight, setRowHeight] = createSignal('auto')
  const stack = useOverlapStack({
    anchor: () => props.anchor ?? 'bottom',
    element,
    height: () => Number.parseFloat(rowHeight()) || COVERED_HEIGHT,
    ids,
  })
  const heightLimit = createMemo(() =>
    Math.max(
      MINIMUM_CARD_HEIGHT,
      (props.maxHeight ?? DEFAULT_FRAME_HEIGHT) - FRAME_PADDING - stack.offset(),
    ),
  )
  const painting = createMemo(() => {
    const ids = stack.order().toReversed()
    const selected = stack.active()
    return selected === null ? ids : [...ids.filter((id) => id !== selected), selected]
  })
  const [heightSource, setHeightSource] = createSignal<'content' | 'constraint'>('constraint')
  const front = useElementRect({
    element: () => cards().get(stack.order()[0]) ?? null,
    layout: heightLimit,
  })
  createEffect(
    on(
      () => [heightLimit(), props.anchor, props.activities] as const,
      (current, previous) => {
        if (previous !== undefined) {
          setHeightSource(
            current[0] === previous[0] && current[1] === previous[1] ? 'content' : 'constraint',
          )
        }
      },
    ),
  )
  createEffect(() => {
    const height = measuredHeight(front())
    untrack(() => {
      if (height !== rowHeight()) {
        stack.relayout(() => setRowHeight(height))
      }
    })
  })
  createEffect(() => {
    const moving = stack.active() !== null
    untrack(() => props.onMoving?.(moving))
  })
  createEffect(() => {
    const id = stack.active() ?? stack.order()[0] ?? null
    untrack(() => props.onSelected?.(id))
  })
  return (
    <div
      ref={setElement}
      role="list"
      aria-label="Codex 채팅 알림"
      data-moving={stack.active() !== null}
      data-sizing={heightSource()}
      class="isolate grid [grid-template-rows:var(--front-height)] [padding-bottom:var(--stack-offset)]
      transition-[grid-template-rows] duration-200 [transition-timing-function:cubic-bezier(.22,.8,.25,1)]
      motion-reduce:transition-none data-[moving=true]:transition-none data-[sizing=constraint]:transition-none"
      style={{
        '--front-height': rowHeight(),
        '--speech-limit': `${heightLimit()}px`,
        '--stack-offset': `${stack.offset()}px`,
      }}
    >
      <For each={painting()}>
        {(id) => {
          const register = (card: HTMLDivElement) =>
            setCards((value) => new Map(value).set(id, card))
          onCleanup(() =>
            setCards((value) => {
              const next = new Map(value)
              next.delete(id)
              return next
            }),
          )
          return (
            <div
              ref={register}
              role="listitem"
              aria-posinset={stack.order().indexOf(id) + 1}
              aria-setsize={stack.order().length}
              data-speech-id={id}
              data-moving={stack.active() !== null}
              data-anchor={props.anchor ?? 'bottom'}
              class="pointer-events-none relative min-w-0 self-end data-[anchor=top]:self-start rounded-xl
              [grid-area:1/1] [transform:translateY(var(--speech-y))]
              wallpaper-speech-motion duration-200
              [transition-timing-function:cubic-bezier(.22,.8,.25,1)]
              data-[moving=true]:transition-none data-[sizing=constraint]:transition-none
              motion-reduce:transition-none data-[moving=true]:[will-change:transform,box-shadow]"
              data-sizing={heightSource()}
              classList={{
                'wallpaper-speech-covered':
                  props.anchor !== 'top' && stack.active() === null && id !== stack.order()[0],
                'wallpaper-speech-covered-top':
                  props.anchor === 'top' && stack.active() === null && id !== stack.order()[0],
              }}
              style={{
                '--speech-depth': `${stack.pose(id).depth}`,
                '--speech-height': `${stack.pose(id).height}px`,
                '--speech-reveal': `${stack.pose(id).reveal}`,
                '--speech-y': `${stack.pose(id).y}px`,
              }}
            >
              <Show when={props.activities?.find((item) => item.sessionId === id)}>
                {(activity) => (
                  <SCodexSpeech
                    anchor={props.anchor}
                    moving={stack.active() !== null}
                    stacked
                    activity={activity()}
                    voiceState={
                      id === (stack.active() ?? stack.order()[0]) ? props.voiceState : undefined
                    }
                    voiceNotice={
                      id === (stack.active() ?? stack.order()[0]) ? props.voiceNotice : undefined
                    }
                    onVoiceRetry={props.onVoiceRetry}
                    approvals={props.approvals?.filter((request) => request.sessionId === id)}
                    questions={props.questions?.filter((request) => request.sessionId === id)}
                    chatLabel={activity().title ?? '새 채팅'}
                    wrap={props.wrap}
                    tone={chatTone(id)}
                    selected={stack.order()[0] === id}
                    onSelect={() => stack.select(id)}
                    onDismiss={
                      props.onDismiss === undefined
                        ? undefined
                        : () => props.onDismiss?.(activity())
                    }
                    target={props.target}
                    layout={(props.layout ?? 0) + stack.revision()}
                  />
                )}
              </Show>
            </div>
          )
        }}
      </For>
    </div>
  )
}
