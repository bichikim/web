import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import * as m from '@paraglide/message'
import {PTooltip} from '../p-tooltip/PTooltip'
import {useTooltipTrigger} from '../tooltip'
import {PlayerIcon} from './PlayerIcon'
import {CLASSES} from './styles'
import type {MusicPlayerViewProps} from './types'

interface PlayButtonProps extends Partial<
  Pick<MusicPlayerViewProps, 'isPlaying' | 'isPreparing' | 'onPause' | 'sceneStyle'>
> {
  readonly hasTrack?: boolean
  readonly large?: boolean
}

export const PlayButton = (props: PlayButtonProps) => {
  const tooltip = useTooltipTrigger()
  const isPauseAction = () => props.isPlaying || props.isPreparing
  return (
    <>
      <Show
        when={props.isPreparing === true}
        fallback={
          <media-play-button
            {...tooltip.triggerProps}
            aria-label={isPauseAction() ? m.player_pause() : m.player_play()}
            class={cx(CLASSES.playerPlay, props.large ? CLASSES.playerPlayLarge : 'shrink-0')}
            disabled={!props.hasTrack}
            attr:notooltip=""
          >
            <PlayerIcon
              icon="i-tabler-player-play"
              sceneStyle={props.sceneStyle}
              size="size-6"
              slot="play"
            />
            <PlayerIcon
              icon="i-tabler-player-pause"
              sceneStyle={props.sceneStyle}
              size="size-6"
              slot="pause"
            />
          </media-play-button>
        }
      >
        <button
          {...tooltip.triggerProps}
          aria-busy="true"
          aria-label={m.player_pause()}
          class={cx(
            CLASSES.playerPlay,
            props.large && CLASSES.playerPlayLarge,
            'relative grid shrink-0 place-items-center rounded-full border-0 p-0',
          )}
          disabled={!props.hasTrack || props.onPause === undefined}
          onClick={() => props.onPause?.()}
          type="button"
        >
          <PlayerIcon icon="i-tabler-player-pause" sceneStyle={props.sceneStyle} size="size-6" />
        </button>
      </Show>
      <PTooltip
        target={tooltip.target()}
        show={tooltip.show()}
        text={isPauseAction() ? m.player_pause() : m.player_play()}
      />
    </>
  )
}
