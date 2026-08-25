import {cx} from 'class-variance-authority'

const EMOTION_ICONS = {
  focus: 'i-tabler-bulb-filled',
  rest: 'i-tabler-music',
} as const satisfies Record<PCharacterEmotionType, string>

// oxlint-disable eslint-js/max-len -- UnoCSS must extract complete arbitrary-value utilities.
const FOCUS_FILTER =
  '[filter:drop-shadow(-0.125rem_0_0_var(--pomo-emotion-outline))_drop-shadow(0.125rem_0_0_var(--pomo-emotion-outline))_drop-shadow(0_-0.125rem_0_var(--pomo-emotion-outline))_drop-shadow(0_0.125rem_0_var(--pomo-emotion-outline))_drop-shadow(0_0_0.25rem_rgb(255_204_82_/_52%))]'

const REST_FILTER =
  '[filter:drop-shadow(-0.125rem_0_0_var(--pomo-emotion-outline))_drop-shadow(0.125rem_0_0_var(--pomo-emotion-outline))_drop-shadow(0_-0.125rem_0_var(--pomo-emotion-outline))_drop-shadow(0_0.125rem_0_var(--pomo-emotion-outline))_drop-shadow(0_0_0.1875rem_rgb(243_201_148_/_36%))]'
// oxlint-enable eslint-js/max-len

export type PCharacterEmotionType = 'focus' | 'rest'

export interface PCharacterEmotionProps {
  readonly active?: boolean
  readonly class?: string
  readonly emotion: PCharacterEmotionType
  readonly image: string
}

export const PCharacterEmotion = (props: PCharacterEmotionProps) => (
  <span
    aria-hidden="true"
    class={cx(
      'relative inline-grid size-14 flex-none place-items-center overflow-visible',
      props.class,
    )}
    data-active={props.active ? '' : undefined}
    data-emotion={props.emotion}
    data-pomo-character-emotion=""
  >
    <img
      alt=""
      class={cx(
        'size-full border-0 rounded-0 bg-transparent object-contain',
        props.active
          ? '[filter:drop-shadow(0_0.125rem_0.1875rem_rgb(0_0_0_/_32%))]'
          : '[filter:grayscale(1)_drop-shadow(0_0.125rem_0.1875rem_rgb(0_0_0_/_32%))]',
      )}
      src={props.image}
    />
    <span
      class={cx(
        EMOTION_ICONS[props.emotion],
        `pointer-events-none absolute right-0 top-0 size-5 origin-[50%_100%] text-[#ffd968] ` +
          `opacity-0 [--pomo-emotion-outline:rgb(8_6_4_/_72%)] ${FOCUS_FILTER} ` +
          `motion-reduce:animate-none motion-reduce:transform-none`,
        props.active &&
          props.emotion === 'focus' &&
          'right-0.5 -top-0.5 origin-[50%_calc(100%-0.125rem)] opacity-100 animate-focus-glow',
        props.active &&
          props.emotion === 'rest' &&
          `text-[#f3c994] opacity-100 animate-rest-sway ${REST_FILTER}`,
      )}
    />
  </span>
)
