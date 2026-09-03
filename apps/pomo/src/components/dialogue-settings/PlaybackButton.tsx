export interface DialoguePlaybackButtonProps {
  readonly isPlaying?: boolean
  readonly onPress?: () => void
}

export const DialoguePlaybackButton = (props: DialoguePlaybackButtonProps) => (
  <button aria-pressed={props.isPlaying ?? false} onClick={() => props.onPress?.()} type="button">
    <span
      aria-hidden="true"
      class={`${props.isPlaying ? 'i-tabler-player-stop' : 'i-tabler-player-play'} size-4`}
    />
    {props.isPlaying ? m.settings_dialogue_stop() : m.settings_dialogue_listen()}
  </button>
)
import * as m from '@paraglide/message'
