import {type Accessor, createMemo, createSignal, type JSX, onCleanup} from 'solid-js'

interface UseCardExpansionProps {
  readonly dialog: Accessor<HTMLDialogElement | null>
  readonly target: Accessor<HTMLDivElement | null>
}

interface ExpansionOffset {
  readonly x: number
  readonly y: number
  readonly scale: number
}

type ExpansionPhase = 'closed' | 'collapsed' | 'expanding' | 'expanded' | 'collapsing'
const CENTER = {scale: 1, x: 0, y: 0} as const
const prefersReducedMotion = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

/** Moves an enlarged card between its source bounds and the modal center. */
export const useCardExpansion = (props: UseCardExpansionProps) => {
  const [phase, setPhase] = createSignal<ExpansionPhase>('closed')
  const [offset, setOffset] = createSignal<ExpansionOffset>(CENTER)
  let source: HTMLButtonElement | null = null
  let frame: number | null = null
  let sequence = 0
  const isExpanded = createMemo(() => phase() !== 'closed')
  const style = createMemo(() => {
    const value = offset()
    return {
      '--card-expansion-scale': `${value.scale}`,
      '--card-expansion-x': `${value.x}px`,
      '--card-expansion-y': `${value.y}px`,
    }
  })
  const cancelFrame = () => {
    if (frame !== null) {
      globalThis.cancelAnimationFrame(frame)
      frame = null
    }
  }
  const readOffset = (): ExpansionOffset | null => {
    const dialog = props.dialog()
    const target = props.target()
    if (source === null || !source.isConnected || dialog === null || target === null) {
      return null
    }
    const origin = source.getBoundingClientRect()
    const destination = dialog.getBoundingClientRect()
    const width = target.clientWidth
    const height = target.clientHeight
    if (width === 0 || height === 0 || origin.width === 0 || origin.height === 0) {
      return null
    }
    return {
      scale: Math.min(origin.width / width, origin.height / height),
      x: origin.left + origin.width / 2 - (destination.left + destination.width / 2),
      y: origin.top + origin.height / 2 - (destination.top + destination.height / 2),
    }
  }
  const completeMotion = (next: 'expanded' | 'closed') => {
    sequence += 1
    const current = sequence
    const complete = () => {
      if (current !== sequence) {
        return
      }
      if (next === 'closed') {
        props.dialog()?.close()
      } else {
        setPhase('expanded')
      }
    }
    const animations = props.target()?.getAnimations?.() ?? []
    if (animations.length === 0) {
      complete()
      return
    }
    Promise.allSettled(animations.map((animation) => animation.finished)).then(complete)
  }
  const handleOpen: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    const dialog = props.dialog()
    if (phase() !== 'closed' || dialog === null) {
      return
    }
    source = event.currentTarget
    setOffset(CENTER)
    setPhase('collapsed')
    dialog.showModal()
    const origin = readOffset()
    if (
      origin === null ||
      prefersReducedMotion() ||
      typeof globalThis.requestAnimationFrame === 'undefined'
    ) {
      setPhase('expanded')
      return
    }
    setOffset(origin)
    // Commit the source geometry before enabling the transition on the next frame.
    props.target()?.getBoundingClientRect()
    frame = globalThis.requestAnimationFrame(() => {
      frame = null
      setPhase('expanding')
      completeMotion('expanded')
    })
  }
  const handleClose = () => {
    const current = phase()
    if (current === 'closed' || current === 'collapsing') {
      return
    }
    cancelFrame()
    const origin = readOffset()
    if (current === 'collapsed' || origin === null || prefersReducedMotion()) {
      sequence += 1
      props.dialog()?.close()
      return
    }
    setOffset(origin)
    setPhase('collapsing')
    completeMotion('closed')
  }
  const handleClosed = () => {
    sequence += 1
    cancelFrame()
    setPhase('closed')
    if (source?.isConnected) {
      source.focus({preventScroll: true})
    }
  }
  onCleanup(() => {
    sequence += 1
    cancelFrame()
  })

  return {handleClose, handleClosed, handleOpen, isExpanded, phase, style}
}
