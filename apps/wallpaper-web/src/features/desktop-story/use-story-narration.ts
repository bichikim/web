import {type Accessor, createEffect, createMemo, on, onCleanup} from 'solid-js'
import type {useCharacterSpeech} from '../character-speech'
import {getStoryNarration} from './get-story-narration'
import type {StoryFrame} from './frame'

interface UseStoryNarrationProps {
  readonly frame: Accessor<StoryFrame>
  readonly ready: Accessor<boolean>
  readonly speech: Pick<ReturnType<typeof useCharacterSpeech>, 'speak' | 'stop'>
}

export const useStoryNarration = (props: UseStoryNarrationProps) => {
  const entering = createMemo(() => {
    const frame = props.frame()
    return frame.visible && !frame.transitioning && props.ready()
      ? getStoryNarration(frame.chapter)
      : null
  })
  createEffect(
    on(entering, (text) => {
      if (text === null) {
        props.speech.stop()
      } else {
        props.speech.speak(text)
      }
    }),
  )
  onCleanup(() => props.speech.stop())
}
