import type {Accessor} from 'solid-js'
import type {Observer} from 'gsap/Observer'
import {STORY_CUTS} from './frame'

interface ConnectStoryInputProps {
  /** Mounted stage whose document owns viewport-wide gestures. */
  readonly target: HTMLElement
  /** Currently committed chapter, or -1 for the interactive playground. */
  readonly chapter: Accessor<number>
  /** True until the complete cover-and-reveal animation has finished. */
  readonly transitioning: Accessor<boolean>
  /** Requests a destination without queuing input received during a transition. */
  readonly request: (chapter: number) => void
}

const isControl = (event: Event) =>
  Boolean(
    event.target instanceof Element &&
    event.target.closest('[popover],input,textarea,select,[contenteditable]'),
  )

const ignoreCheck = (event: Event, pointer: boolean) =>
  isControl(event) ||
  (event instanceof WheelEvent &&
    (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))) ||
  Boolean(
    pointer && event.target instanceof Element && event.target.closest('[data-character-drag]'),
  )

const keyboardChapter = (event: KeyboardEvent, chapter: number) => {
  switch (event.key) {
    case 'ArrowDown':
    case 'PageDown':
      return chapter + 1
    case 'ArrowUp':
    case 'PageUp':
      return chapter - 1
    case ' ':
      return chapter + (event.shiftKey ? -1 : 1)
    case 'Home':
      return -1
    case 'End':
      return STORY_CUTS.length - 1
    default:
      return null
  }
}

/** Connects Observer and keyboard input; the returned cleanup releases both, including pending setup. */
export const connectStoryInput = (props: ConnectStoryInputProps) => {
  let input: Observer | null = null
  let disposed = false
  const requestChapter = (chapter: number) => {
    if (!props.transitioning() && chapter >= -1 && chapter < STORY_CUTS.length) {
      props.request(chapter)
    }
  }
  const handleForward = () => requestChapter(props.chapter() + 1)
  const handleBackward = () => requestChapter(props.chapter() - 1)
  const handleKey = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      isControl(event) ||
      (event.key === ' ' &&
        event.target instanceof Element &&
        event.target.closest('button,[role="button"]'))
    ) {
      return
    }
    const chapter = keyboardChapter(event, props.chapter())
    if (chapter !== null) {
      event.preventDefault()
      if (!event.repeat) {
        requestChapter(chapter)
      }
    }
  }
  globalThis.addEventListener('keydown', handleKey)
  const initialize = async () => {
    const [{gsap}, {Observer: InputObserver}] = await Promise.all([
      import('gsap'),
      import('gsap/Observer'),
    ])
    if (disposed) {
      return
    }
    gsap.registerPlugin(InputObserver)
    input = InputObserver.create({
      allowClicks: true,
      capture: true,
      dragMinimum: 12,
      ignoreCheck,
      lockAxis: true,
      onDown: handleBackward,
      onUp: handleForward,
      preventDefault: true,
      target: props.target.ownerDocument,
      tolerance: 28,
      type: 'wheel,touch',
      wheelSpeed: -1,
    })
  }
  initialize().catch((cause: unknown) => {
    if (!disposed) {
      console.error('Story gesture input failed', cause)
    }
  })
  return () => {
    disposed = true
    input?.kill()
    globalThis.removeEventListener('keydown', handleKey)
  }
}
