import {localizeMessage, text as uiText} from '../localization'
import {type Accessor, createEffect, createMemo, createSignal, untrack} from 'solid-js'
import {codexPhaseLabel} from '../codex/phase-label'
import type {CodexActivity} from '../codex/types'
import {CHARACTER_SPEECH_ID, type useCharacterChat} from '../conversation/use-character-chat'
import type {SpeechAnchor, SpeechPoint} from './types'
import {useSpeechStackLayout} from './use-speech-stack-layout'
import {useStackPreview} from './use-stack-preview'

interface UseSpeechStackProps {
  /** Borrows the stack element for measurement and pointer tracking. */
  readonly element: Accessor<HTMLElement | null>
  /** Borrows mounted cards, retaining their input state while omitted from previews. */
  readonly cards: Accessor<ReadonlyMap<string, HTMLElement>>
  /** Returns current Codex conversations, including those available only in the list. */
  readonly activities: Accessor<readonly CodexActivity[] | undefined>
  /** Returns the optional character conversation. */
  readonly character: Accessor<ReturnType<typeof useCharacterChat> | undefined>
  /** Returns the attachment edge to preserve during preview and list interaction. */
  readonly anchor: Accessor<SpeechAnchor>
  readonly target?: Accessor<SpeechPoint | undefined>
  readonly layout?: Accessor<unknown>
  /** Returns the window's available height; an undefined value uses the standard frame height. */
  readonly maxHeight: Accessor<number | undefined>
  /** Returns whether the character or bubbles are being dragged. */
  readonly dragging: Accessor<boolean>
  /** Reports the foreground conversation, or null for an empty stack; omission ignores selection. */
  readonly onSelected?: (id: string | null) => void
  /** Reports selection motion; omission ignores motion state. */
  readonly onMoving?: (active: boolean) => void
  /** Reports capture in any mounted conversation; omission ignores recording state. */
  readonly onRecording?: (active: boolean) => void
}

/** Coordinates foreground selection, bounded previews, overflow navigation and recording. */
export const useSpeechStack = (props: UseSpeechStackProps) => {
  const [recordingId, setRecordingId] = createSignal<string | null>(null)
  const [browsing, setBrowsing] = createSignal(false)
  const record = (id: string, active: boolean) =>
    setRecordingId((current) => (active ? id : current === id ? null : current))
  createEffect(() => {
    const active = recordingId() !== null
    untrack(() => props.onRecording?.(active))
  })
  const ids = createMemo(() => [
    ...(props.activities()?.map((item) => item.sessionId) ?? []),
    ...(props.character() === undefined ? [] : [CHARACTER_SPEECH_ID]),
  ])
  const stack = useSpeechStackLayout({
    anchor: props.anchor,
    cards: props.cards,
    content: () => [props.activities(), props.character()?.response()],
    element: props.element,
    ids,
    layout: props.layout,
    maxHeight: props.maxHeight,
    target: props.target,
  })
  const preview = useStackPreview({
    busy: () => stack.active() !== null || props.dragging() || browsing(),
    element: props.element,
  })
  const overflowItems = createMemo(() => {
    const activities = new Map(props.activities()?.map((item) => [item.sessionId, item]))
    return stack.overflow().map((id) => {
      if (id === CHARACTER_SPEECH_ID) {
        return {
          id,
          get status() {
            return props.character()?.busy() ? uiText('답변 중') : uiText('대화 가능')
          },
          get title() {
            return uiText('캐릭터와 대화')
          },
        }
      }
      const activity = activities.get(id)
      return {
        id,
        status: localizeMessage(codexPhaseLabel(activity?.phase ?? 'idle')),
        title: activity?.title ?? uiText('새 채팅'),
      }
    })
  })
  const selectOverflow = async (id: string) => {
    await stack.select(id)
    if (stack.order()[0] === id) {
      props
        .cards()
        .get(id)
        ?.querySelector<HTMLButtonElement>('button[data-speech-drag-handle]')
        ?.focus({preventScroll: true})
    }
  }
  createEffect(() => {
    const active = stack.active()
    const id = active ?? stack.order()[0] ?? null
    untrack(() => {
      props.onMoving?.(active !== null)
      props.onSelected?.(id)
    })
  })
  return {...stack, ...preview, browseChanged: setBrowsing, overflowItems, record, selectOverflow}
}
