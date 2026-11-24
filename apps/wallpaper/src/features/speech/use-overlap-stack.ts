import {type Accessor, batch, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import {createStackMotion, type StackElement, type StackPose} from './stack-motion'
import type {SpeechAnchor} from './types'
import {COVERED_HEIGHT, COVERED_STEP} from './constants'

interface UseOverlapStackProps {
  readonly ids: Accessor<readonly string[]>
  readonly element: Accessor<HTMLElement | null>
  readonly step?: number
  readonly height?: Accessor<number>
  readonly anchor?: Accessor<SpeechAnchor>
  /** Keeps the front at its saved edge when the preview direction changes; defaults to anchor. */
  readonly attachment?: Accessor<SpeechAnchor>
  /** Caps cards contributing to stack geometry; omission reserves space for every card. */
  readonly limit?: number
}
const report = (cause: unknown) => console.error('Poffo speech motion failed', cause)
const mergeOrder = (props: {
  readonly previous: readonly string[]
  readonly ids: readonly string[]
}) => [
  ...props.previous.filter((id) => props.ids.includes(id)),
  ...props.ids.filter((id) => !props.previous.includes(id)),
]
const restingPose = (props: {
  readonly id: string
  readonly order: readonly string[]
  readonly step: number
  readonly height: number
  readonly anchor: SpeechAnchor
  readonly attachment: SpeechAnchor | undefined
  readonly limit: number
}): StackPose => {
  const count = Math.min(props.order.length, props.limit)
  const index = Math.min(props.order.indexOf(props.id), count - 1)
  const offset = Math.max(0, count - 1) * props.step
  const origin = (props.attachment ?? props.anchor) === 'top' ? 0 : offset
  const y =
    index === 0
      ? origin
      : origin +
        (props.anchor === 'top'
          ? props.height + index * props.step - COVERED_HEIGHT
          : COVERED_HEIGHT - props.height - index * props.step)
  return {
    depth: 0,
    height: index === 0 ? props.height : COVERED_HEIGHT,
    reveal: index === 0 ? 1 : 0,
    y,
  }
}

/** Maintains front-to-back order and interruptible vertical selection motion. */
export const useOverlapStack = (props: UseOverlapStackProps) => {
  const [order, setOrder] = createSignal<readonly string[]>([])
  const [poses, setPoses] = createSignal<ReadonlyMap<string, StackPose>>(new Map())
  const [active, setActive] = createSignal<string | null>(null)
  const [revision, setRevision] = createSignal(0)
  const step = () => props.step ?? COVERED_STEP
  let request = 0
  let disposed = false
  let layoutRequest = 0
  const destination = (id: string) =>
    restingPose({
      anchor: props.anchor?.() ?? 'bottom',
      attachment: props.attachment?.(),
      height: props.height?.() ?? COVERED_HEIGHT,
      id,
      limit: props.limit ?? order().length,
      order: order(),
      step: step(),
    })
  const motion = createStackMotion({
    anchor: () => props.anchor?.() ?? 'bottom',
    destination,
    element: props.element,
    onFreeze: (drawn) => setPoses(new Map(drawn)),
    onLayout: () => setRevision((value) => value + 1),
    onPose: (id, value) => setPoses((current) => new Map(current).set(id, value)),
  })

  const commit = async (
    id: string,
    drawn: ReadonlyMap<string, StackElement>,
    latest: number,
    animated: boolean,
  ) => {
    const current = motion.phase()
    const reorder = () => {
      setOrder((value) => [id, ...value.filter((item) => item !== id)])
    }
    motion.withLayout(() => batch(reorder))
    if (animated) {
      const shifted = motion.rebase(drawn)
      await Promise.all(Array.from(shifted, ([item, from]) => motion.land(item, from, current)))
    }
    if (!disposed && latest === request && current === motion.phase()) {
      setActive(null)
      setRevision((value) => value + 1)
    }
  }

  const select = async (id: string) => {
    if (disposed || !order().includes(id) || (active() === null && order()[0] === id)) {
      return
    }
    request += 1
    const latest = request
    let drawn = motion.freeze()
    const initial = drawn.get(id)
    if (initial === undefined) {
      return
    }
    const animated =
      initial.element.getClientRects().length > 0 && motion.available(initial.element)
    motion.withLayout(() => setActive(id))
    drawn = motion.rebase(drawn)
    const selected = drawn.get(id)!
    if (animated) {
      const current = motion.phase()
      for (const [other, from] of drawn) {
        if (other !== id) {
          motion.land(other, from, current).catch(report)
        }
      }
      const lifted = await motion.lift(id, selected, current)
      if (!lifted || latest !== request) {
        return
      }
      drawn = motion.freeze()
    }
    await commit(id, drawn, latest, animated)
  }

  const relayout = (change: () => void) => {
    layoutRequest += 1
    const layout = layoutRequest
    if (motion.changing() || active() === null) {
      change()
      return
    }
    queueMicrotask(() => {
      if (disposed || layout !== layoutRequest) {
        return
      }
      const selected = active()
      if (selected === null) {
        change()
        return
      }
      request += 1
      const latest = request
      const drawn = motion.freeze()
      motion.withLayout(change)
      commit(selected, motion.rebase(drawn), latest, true).catch(report)
    })
  }

  const synchronize = (ids: readonly string[]) => {
    const previous = order()
    const next = mergeOrder({ids, previous})
    if (next.length === previous.length && next.every((id, index) => id === previous[index])) {
      return
    }
    const selected = active()
    request += 1
    const drawn = motion.freeze()
    motion.withLayout(() =>
      batch(() => {
        setOrder(next)
        setActive(selected !== null && next.includes(selected) ? selected : null)
        setPoses(
          new Map(
            next.map((id) => [
              id,
              active() === null ? destination(id) : (drawn.get(id) ?? destination(id)),
            ]),
          ),
        )
      }),
    )
    if (selected !== null && next.includes(selected)) {
      motion.rebase(drawn)
      select(selected).catch(report)
    }
  }
  createEffect(() => {
    const ids = props.ids()
    untrack(() => synchronize(ids))
  })
  onCleanup(() => {
    disposed = true
    request += 1
    motion.dispose()
  })
  return {
    active,
    offset: () => Math.max(0, Math.min(order().length, props.limit ?? order().length) - 1) * step(),
    order,
    pose: (id: string) =>
      active() === null ? destination(id) : (poses().get(id) ?? destination(id)),
    relayout,
    revision,
    select: (id: string) => select(id).catch(report),
  }
}
