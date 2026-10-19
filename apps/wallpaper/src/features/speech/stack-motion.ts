import {type Accessor, batch} from 'solid-js'
import {withScrollPreserved} from './with-scroll-preserved'
import type {SpeechAnchor} from './types'

export interface StackPose {
  readonly y: number
  readonly depth: number
  readonly reveal: number
  readonly height: number
}
export interface StackElement extends StackPose {
  readonly element: HTMLElement
  readonly origin: number
}
interface StackTransition {
  readonly id: string
  readonly from: StackElement
  readonly to: StackPose
  readonly duration: number
  readonly current: number
}

interface StackMotionProps {
  readonly destination: (id: string) => StackPose
  readonly element: Accessor<HTMLElement | null>
  readonly onPose: (id: string, value: StackPose) => void
  readonly onFreeze: (values: ReadonlyMap<string, StackElement>) => void
  readonly onLayout: () => void
  readonly anchor: Accessor<SpeechAnchor>
}
const EASING = 'cubic-bezier(.22, .8, .25, 1)'
const SPEED = 160
const SECOND = 1000
const LIFT = 8
const LIFT_DURATION = 200
const SETTLE_DURATION = 180
const readPose = (props: {
  readonly element: HTMLElement
  readonly origin: number
}): StackElement => {
  const style = getComputedStyle(props.element)
  return {
    depth: Number.parseFloat(style.getPropertyValue('--speech-depth')) || 0,
    element: props.element,
    height: Number.parseFloat(style.getPropertyValue('--speech-height')) || 0,
    origin: props.origin,
    reveal: Number.parseFloat(style.getPropertyValue('--speech-reveal')) || 0,
    y: Number.parseFloat(style.getPropertyValue('--speech-y')) || 0,
  }
}
const travelDuration = (props: {
  readonly anchor: SpeechAnchor
  readonly from: StackPose
  readonly to: StackPose
}) => {
  const direction = props.anchor === 'top' ? 1 : -1
  const distance = Math.max(
    Math.abs(props.to.y - props.from.y),
    Math.abs(
      props.to.y + direction * props.to.height - props.from.y - direction * props.from.height,
    ),
  )
  return (distance / SPEED) * SECOND
}
const baseline = (element: HTMLElement | null, anchor: SpeechAnchor) => {
  if (element === null) {
    return 0
  }
  const bounds = element.getBoundingClientRect()
  return anchor === 'top'
    ? bounds.top
    : bounds.bottom - (Number.parseFloat(getComputedStyle(element).paddingBottom) || 0)
}
const registerProperties = () => {
  if (typeof globalThis.CSS?.registerProperty !== 'function') {
    return false
  }
  for (const property of [
    {inherits: false, initialValue: '0px', name: '--speech-y', syntax: '<length>'},
    {inherits: true, initialValue: '0', name: '--speech-depth', syntax: '<number>'},
    {inherits: true, initialValue: '1', name: '--speech-reveal', syntax: '<number>'},
    {inherits: true, initialValue: '0px', name: '--speech-height', syntax: '<length>'},
  ]) {
    try {
      CSS.registerProperty(property)
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'InvalidModificationError')) {
        throw cause
      }
    }
  }
  return true
}

/** Owns animation lifetimes and captures rendered custom properties before cancellation. */
export const createStackMotion = (props: StackMotionProps) => {
  const supported = registerProperties()
  const animations = new Map<string, Animation>()
  let phase = 0
  let disposed = false
  let changing = false
  const withLayout = (change: () => void) => {
    const previous = changing
    changing = true
    try {
      withScrollPreserved({change, element: props.element()})
    } finally {
      changing = previous
    }
  }
  const elements = () =>
    Array.from(props.element()?.children ?? []).filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    )

  const freeze = () => {
    phase += 1
    const origin = baseline(props.element(), props.anchor())
    const drawn = new Map<string, StackElement>()
    for (const element of elements()) {
      const id = element.dataset.speechId
      if (id !== undefined) {
        drawn.set(id, readPose({element, origin}))
      }
    }
    batch(() => {
      props.onFreeze(drawn)
      for (const animation of animations.values()) {
        animation.cancel()
      }
      animations.clear()
    })
    return drawn
  }

  const rebase = (drawn: ReadonlyMap<string, StackElement>) => {
    const origin = baseline(props.element(), props.anchor())
    const shifted = new Map(
      Array.from(drawn, ([id, from]) => [
        id,
        {
          ...from,
          origin,
          y: from.y + from.origin - origin,
        },
      ]),
    )
    props.onFreeze(shifted)
    return shifted
  }

  const animate = async (options: StackTransition) => {
    const {id, from, to, duration, current} = options
    if (disposed || current !== phase) {
      return false
    }
    props.onPose(id, to)
    if (duration === 0) {
      return true
    }
    const animation = from.element.animate(
      [
        {
          '--speech-depth': `${from.depth}`,
          '--speech-height': `${from.height}px`,
          '--speech-reveal': `${from.reveal}`,
          '--speech-y': `${from.y}px`,
        },
        {
          '--speech-depth': `${to.depth}`,
          '--speech-height': `${to.height}px`,
          '--speech-reveal': `${to.reveal}`,
          '--speech-y': `${to.y}px`,
        },
      ],
      {duration, easing: EASING, fill: 'both'},
    )
    animations.set(id, animation)
    try {
      await animation.finished
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        return false
      }
      throw cause
    }
    if (disposed || current !== phase || animations.get(id) !== animation) {
      return false
    }
    animations.delete(id)
    animation.cancel()
    props.onLayout()
    return true
  }

  const land = async (id: string, from: StackElement, current: number) => {
    const target = props.destination(id)
    const raised = {...target, depth: from.depth}
    const duration = travelDuration({anchor: props.anchor(), from, to: target})
    const arrived = await animate({current, duration, from, id, to: raised})
    if (arrived && from.depth > 0) {
      await animate({
        current,
        duration: SETTLE_DURATION,
        from: {...from, ...raised},
        id,
        to: target,
      })
    }
  }

  return {
    animate,
    available: (element: HTMLElement) =>
      supported &&
      typeof element.animate === 'function' &&
      !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    changing: () => changing,
    dispose: () => {
      disposed = true
      phase += 1
      for (const animation of animations.values()) {
        animation.cancel()
      }
      animations.clear()
    },
    freeze,
    land,
    lift: (id: string, from: StackElement, current: number) =>
      animate({
        current,
        duration: LIFT_DURATION,
        from,
        id,
        to: {
          depth: 1,
          height: from.height,
          reveal: from.reveal,
          y: from.y + (props.anchor() === 'top' ? LIFT : -LIFT),
        },
      }),
    phase: () => phase,
    rebase,
    withLayout,
  }
}
