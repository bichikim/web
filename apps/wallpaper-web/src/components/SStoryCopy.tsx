import {Show} from 'solid-js'
import chapters from '../data/story/chapters.json'
import type {useCharacterSpeech} from '../features/character-speech'
import {getStoryNarration} from '../features/desktop-story/get-story-narration'
import {SStorySpeech} from './SStorySpeech'

interface SStoryCopyProps {
  readonly chapter: number
  readonly animated?: boolean
  readonly ready?: boolean
  readonly speech?: ReturnType<typeof useCharacterSpeech>
}

export const SStoryCopy = (props: SStoryCopyProps) => {
  const chapter = () => chapters[props.chapter]!
  return (
    <div class="relative" classList={{'animate-story-caption': props.animated}}>
      <div class="flex items-start gap-2">
        <p class="min-w-0 text-[clamp(0.8rem,3.5vw,1rem)] font-700 leading-6 sm:text-lg">
          {chapter().title}
        </p>
        <Show when={props.speech}>
          {(speech) => (
            <SStorySpeech
              speech={speech()}
              text={getStoryNarration(props.chapter) ?? ''}
              disabled={!props.ready}
            />
          )}
        </Show>
      </div>
      <p class="mt-1.5 max-w-83 break-keep text-[11px] leading-5 text-ink/85 sm:text-sm sm:leading-6">
        {chapter().description}
      </p>
    </div>
  )
}
