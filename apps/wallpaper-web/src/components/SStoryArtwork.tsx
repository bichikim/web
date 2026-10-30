import {createMemo, For} from 'solid-js'
import {SStoryPrint} from './SStoryPrint'
import type {StoryTransition} from '../features/desktop-story/types'

const WORDS = ['DESKTOP', 'WALLPAPER', 'WIDGETS', 'DETAILS', 'CODEX', 'POFFO'] as const

interface SStoryArtworkProps {
  /** Chapter word and its prepared typography movement. */
  readonly transition: StoryTransition
  /** A typography placement appropriate to the containing plane. */
  readonly class?: string
  /** Light ink for a dark color plane. */
  readonly light?: boolean
  /** Full decoration by default; halftone keeps only a restrained dot field. */
  readonly print?: 'full' | 'halftone'
  /** Number of word tiles per row; defaults to two for the larger transition planes. */
  readonly repetitions?: number
}

export const SStoryArtwork = (props: SStoryArtworkProps) => {
  const text = createMemo(() => {
    const word = WORDS[props.transition.to] ?? 'PLAY'
    return Array.from({length: props.repetitions ?? 2}, () => word).join(' / ')
  })
  return (
    <>
      <SStoryPrint light={props.light} variant={props.print} />
      <div
        class={`absolute -left-[6vw] top-1/2 w-[160vw] whitespace-nowrap text-[57.6dvh]
        font-900 leading-[0.75] tracking-[-0.075em] text-ink
        [font-family:Arial,Helvetica,sans-serif] ${props.class ?? ''}`}
        classList={{
          'animate-story-type-cover': props.transition.phase === 'cover',
          'animate-story-type-reveal': props.transition.phase === 'reveal',
          'text-[#bda5e7]!': props.light === true,
        }}
      >
        <For each={[0, 1, 2]}>
          {(row) => (
            <p
              class="w-max"
              classList={{
                '-translate-x-[12%] text-transparent [-webkit-text-stroke:2px_#25232c]': row === 1,
                '[-webkit-text-stroke:2px_#bda5e7]!': row === 1 && props.light === true,
              }}
            >
              {text()}
            </p>
          )}
        </For>
      </div>
    </>
  )
}
