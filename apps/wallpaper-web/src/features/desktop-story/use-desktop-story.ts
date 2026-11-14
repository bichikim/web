import {type Accessor, createEffect, createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {connectStoryInput} from './connect-story-input'
import {resolveStoryFrame, STORY_CUTS} from './frame'
import {advanceStoryTransition, INITIAL_STORY} from './transition'
import {getStoryTransitionStyle} from './transition-style'

interface UseDesktopStoryProps {
  readonly onRequest?: () => void
  /** Visible stage receiving gestures and defining character placement. */
  readonly stage: Accessor<HTMLElement | null>
  readonly dragging?: Accessor<boolean>
}

export const useDesktopStory = (props: UseDesktopStoryProps) => {
  const [viewport, setViewport] = createSignal({
    animated: true,
    height: 0,
    reducedMotion: false,
    width: 0,
  })
  const [requested, setRequested] = createSignal(-1)
  const [state, setState] = createSignal(INITIAL_STORY)
  createEffect(() => {
    const chapter = requested()
    const {animated, reducedMotion} = viewport()
    setState((current) =>
      advanceStoryTransition(current, {
        chapter,
        reducedMotion: reducedMotion || !animated,
        type: 'request',
      }),
    )
  })
  const transition = createMemo(() => state().transition)
  const aspectRatio = createMemo(() => {
    const {height, width} = viewport()
    return height > 0 ? width / height : 1
  })
  const frame = createMemo(() => {
    const current = state()
    const settled = resolveStoryFrame({...viewport(), distance: STORY_CUTS[current.chapter] ?? 0})
    return {
      ...settled,
      active: current.chapter >= 0 || current.transition !== null,
      transitioning: current.transition !== null,
    }
  })
  const scenes = createMemo(() => {
    const current = transition()
    if (!current || getStoryTransitionStyle(current) !== 'diagonal') {
      return {incoming: frame(), outgoing: null, transition: null}
    }
    const view = viewport()
    const resolveChapter = (chapter: number) => ({
      ...resolveStoryFrame({...view, distance: STORY_CUTS[chapter] ?? 0}),
      transitioning: true,
    })
    return {
      incoming: resolveChapter(current.to),
      outgoing: resolveChapter(current.from),
      transition: current,
    }
  })
  const covered = (revision: number) =>
    setState((current) => advanceStoryTransition(current, {revision, type: 'covered'}))
  const finished = (revision: number) =>
    setState((current) => advanceStoryTransition(current, {revision, type: 'finished'}))
  const requestChapter = (chapter: number) => {
    if (transition() === null) {
      props.onRequest?.()
      setRequested(Math.max(-1, Math.min(STORY_CUTS.length - 1, chapter)))
    }
  }
  onMount(() => {
    const stage = props.stage()
    if (stage === null) {
      return
    }
    const media = globalThis.matchMedia('(prefers-reduced-motion: reduce)')
    const animated =
      CSS.supports('height', '100dvh') &&
      CSS.supports('clip-path', 'polygon(0 0,100% 0,100% 100%,0 100%)')
    let pending: number | null = null
    const measure = () => {
      pending = null
      const height = stage.clientHeight
      const width = stage.clientWidth
      const reducedMotion = media.matches
      setViewport((current) =>
        current.animated === animated &&
        current.height === height &&
        current.width === width &&
        current.reducedMotion === reducedMotion
          ? current
          : {animated, height, reducedMotion, width},
      )
    }
    const schedule = () => {
      pending ??= requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(stage)
    media.addEventListener('change', schedule)
    measure()
    const disconnectInput = connectStoryInput({
      chapter: () => state().chapter,
      dragging: props.dragging,
      request: requestChapter,
      target: stage,
      transitioning: () => transition() !== null,
    })
    onCleanup(() => {
      disconnectInput()
      observer.disconnect()
      media.removeEventListener('change', schedule)
      if (pending !== null) {
        cancelAnimationFrame(pending)
      }
    })
  })
  const returnToPlayground = () => requestChapter(-1)
  const startIntroduction = () => requestChapter(0)
  return {
    aspectRatio,
    covered,
    finished,
    frame,
    returnToPlayground,
    scenes,
    startIntroduction,
    transition,
    viewportWidth: () => viewport().width,
  }
}
