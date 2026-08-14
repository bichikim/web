import {cx} from 'class-variance-authority'

import './FocusRoomCharacterEmotion.css'

const EMOTION_ICONS = {
  focus: 'i-tabler-bulb-filled',
  rest: 'i-tabler-music',
} as const satisfies Record<FocusRoomCharacterEmotionType, string>

export type FocusRoomCharacterEmotionType = 'focus' | 'rest'

export interface FocusRoomCharacterEmotionProps {
  readonly active?: boolean
  readonly class?: string
  readonly emotion: FocusRoomCharacterEmotionType
  readonly image: string
}

export const FocusRoomCharacterEmotion = (props: FocusRoomCharacterEmotionProps) => (
  <span
    aria-hidden="true"
    class={cx('focus-room-character-emotion', props.class)}
    data-active={props.active ? '' : undefined}
    data-emotion={props.emotion}
  >
    <img alt="" class="focus-room-character-emotion__image" src={props.image} />
    <span class={cx('focus-room-character-emotion__symbol', EMOTION_ICONS[props.emotion])} />
  </span>
)
