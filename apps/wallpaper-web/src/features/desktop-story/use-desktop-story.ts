import {type Accessor, createEffect, createMemo, createSignal, onCleanup, onMount} from 'solid-js'
import {connectStoryInput} from './connect-story-input'
import {resolveStoryFrame, STORY_CUTS} from './frame'
import {advanceStoryTransition, INITIAL_STORY} from './transition'
import {getStoryTransitionStyle} from './transition-style'

interface UseDesktopStoryProps {
  readonly onRequest?: () => void
  /** Visible stage receiving gestures and defining character placement. */
  readonly stage: Accessor<HTMLElement | null>
}

export const useDesktopStory = (props: UseDesktopStoryProps) => {
  const [viewport, setViewport] = createSignal({
    height: 0,
    reducedMotion: false,
    width: 0,
  })
  const [requested, setRequested] = createSignal(-1)
  const [state, setState] = createSignal(INITIAL_STORY)
  createEffect(() => {
    const chapter = requested()
    const {reducedMotion} = viewport()
    setState((current) =>
      advanceStoryTransition(current, {chapter, reducedMotion, type: 'request'}),
    )
  })
  const transition = createMemo(() => state().transition)
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
    let pending: number | null = null
    const measure = () => {
      pending = null
      const height = stage.clientHeight
      const width = stage.clientWidth
      setViewport((current) =>
        current.height === height &&
        current.width === width &&
        current.reducedMotion === media.matches
          ? current
          : {height, reducedMotion: media.matches, width},
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
  return {covered, finished, frame, returnToPlayground, scenes, startIntroduction, transition}
}
