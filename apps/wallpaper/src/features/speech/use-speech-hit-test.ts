import {isTauri} from '@tauri-apps/api/core'
import {type Accessor, createEffect, onCleanup} from 'solid-js'
import {useNativeHitTest} from '../hit-test'
import {readSpeechMask} from './read-speech-mask'

interface UseSpeechHitTestProps {
  readonly element: Accessor<HTMLElement | null>
  readonly layout?: Accessor<unknown>
  readonly onError: (cause: unknown) => void
}
/** Refreshes visible input regions on layout changes and while their animations are running. */
export const useSpeechHitTest = (props: UseSpeechHitTestProps) => {
  const native = isTauri()
  const region = useNativeHitTest({onError: props.onError})
  createEffect(() => {
    const element = props.element()
    if (!native || element === null) {
      return
    }
    const canvas = document.createElement('canvas')
    let frame: number | undefined
    let failed = false
    const sample = () => {
      frame = undefined
      try {
        region.publish({interactive: false, mask: readSpeechMask({canvas, element})})
        if (
          element
            .getAnimations({subtree: true})
            .some((animation) => animation.playState === 'running' || animation.pending)
        ) {
          schedule()
        }
      } catch (cause) {
        failed = true
        region.disable(cause)
      }
    }
    const schedule = () => {
      if (!failed && frame === undefined) {
        frame = requestAnimationFrame(sample)
      }
    }
    const mutation = new MutationObserver(schedule)
    mutation.observe(element, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    })
    const resize = new ResizeObserver(schedule)
    resize.observe(element)
    window.addEventListener('resize', schedule)
    createEffect(() => {
      props.layout?.()
      schedule()
    })
    schedule()
    onCleanup(() => {
      mutation.disconnect()
      resize.disconnect()
      window.removeEventListener('resize', schedule)
      if (frame !== undefined) {
        cancelAnimationFrame(frame)
      }
    })
  })
}
