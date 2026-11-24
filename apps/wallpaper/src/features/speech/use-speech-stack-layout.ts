import {type Accessor, createEffect, createMemo, createSignal, on, untrack} from 'solid-js'
import {COVERED_HEIGHT, MAXIMUM_SPEECH_HEIGHT, MAXIMUM_SPEECH_PREVIEWS} from './constants'
import {useElementRect} from './use-element-rect'
import {useOverlapStack} from './use-overlap-stack'
import {speechTail} from './tail'
import type {SpeechAnchor, SpeechPoint, SpeechRect} from './types'

const FRAME_PADDING = 72
const DEFAULT_FRAME_HEIGHT = 640
const MINIMUM_CARD_HEIGHT = 160
const MEASUREMENT_PRECISION = 1000
const measuredHeight = (rect: SpeechRect | null) =>
  rect === null
    ? 'auto'
    : `${Math.round(rect.height * MEASUREMENT_PRECISION) / MEASUREMENT_PRECISION}px`

interface UseSpeechStackLayoutProps {
  /** Returns the stack container; it is borrowed and never removed by this hook. */
  readonly element: Accessor<HTMLElement | null>
  /** Returns the currently mounted bubble elements, keyed by identity. */
  readonly cards: Accessor<ReadonlyMap<string, HTMLElement>>
  /** Returns the stable bubble identities to retain in selection order. */
  readonly ids: Accessor<readonly string[]>
  /** Returns the attachment edge used for placement and selection motion. */
  readonly anchor: Accessor<SpeechAnchor>
  /** Returns the character position; omission retains the saved preview direction. */
  readonly target?: Accessor<SpeechPoint | undefined>
  readonly layout?: Accessor<unknown>
  /** Returns the available window height; omission of a value uses 640px. */
  readonly maxHeight: Accessor<number | undefined>
  /** Returns content whose identity changes should trigger content-size transitions. */
  readonly content: Accessor<unknown>
}

/** Measures the front card and preserves stack geometry across content and constraint changes. */
export const useSpeechStackLayout = (props: UseSpeechStackLayoutProps) => {
  const [rowHeight, setRowHeight] = createSignal('auto')
  const stack = useOverlapStack({
    anchor: () => anchor(),
    attachment: props.anchor,
    element: props.element,
    height: () => Number.parseFloat(rowHeight()) || COVERED_HEIGHT,
    ids: props.ids,
    limit: MAXIMUM_SPEECH_PREVIEWS,
  })
  const heightLimit = createMemo(() =>
    Math.min(
      MAXIMUM_SPEECH_HEIGHT,
      Math.max(
        MINIMUM_CARD_HEIGHT,
        (props.maxHeight() ?? DEFAULT_FRAME_HEIGHT) - FRAME_PADDING - stack.offset(),
      ),
    ),
  )
  const painting = createMemo(() => {
    const ids = stack.order().toReversed()
    const selected = stack.active()
    return selected === null ? ids : [...ids.filter((id) => id !== selected), selected]
  })
  const [heightSource, setHeightSource] = createSignal<'content' | 'constraint'>('constraint')
  const front = useElementRect({
    element: () => props.cards().get(stack.order()[0]) ?? null,
    layout: heightLimit,
  })
  const bounds = useElementRect({
    element: props.element,
    layout: () => [props.anchor(), props.target?.(), props.layout?.(), rowHeight(), stack.offset()],
  })
  const anchor = createMemo(() => {
    const rect = bounds()
    const target = props.target?.()
    const height = Number.parseFloat(rowHeight())
    const attachment = props.anchor()
    if (rect === null || target === undefined || !Number.isFinite(height)) {
      return attachment
    }
    const origin = rect.y + (attachment === 'top' ? 0 : stack.offset())
    const tail = speechTail({
      height: height - 2,
      width: rect.width - 2,
      x: target.x - rect.x - 1,
      y: target.y - origin - 1,
    })
    return tail?.edge === 'top' ? 'top' : attachment
  })
  createEffect(
    on(
      () => [heightLimit(), props.anchor(), props.content()] as const,
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
  const previews = createMemo(() => {
    const order = stack.order()
    const selected = stack.active()
    return (selected === null ? order : [selected, ...order.filter((id) => id !== selected)]).slice(
      0,
      MAXIMUM_SPEECH_PREVIEWS,
    )
  })
  const overflow = createMemo(() => stack.order().slice(MAXIMUM_SPEECH_PREVIEWS))
  return {...stack, anchor, heightLimit, heightSource, overflow, painting, previews, rowHeight}
}
