import type {PSceneStyle} from '../../../../features/focus-room-animation'
import * as m from '@paraglide/message'
import {Show} from 'solid-js'
import {PreferenceProvider} from '../../../../hooks/use-preference'
import {createPcm16WavBuffer} from '../../../../utils/create-pcm16-wav-buffer'
import {MediaPlayer} from '../../../media-player/MediaPlayer'
import {useMediaPlayer} from '../../../media-player/context'
import {PTooltipContent, PTooltipProvider} from '../../../tooltip'
import {ExpandedPlayerControls} from '../../ExpandedPlayerControls'
import {SummaryPlayButton} from '../../SummaryPlayButton'
import {CLASSES} from '../../styles'

interface PlaybackControlsProps {
  readonly compact?: boolean
  readonly hasTrack?: boolean
  readonly isPreparing?: boolean
  readonly onPause?: () => void
  readonly sceneStyle?: PSceneStyle
}

const PlaybackControlsContent = (props: PlaybackControlsProps) => {
  const player = useMediaPlayer()
  const isPreparing = () => props.isPreparing === true || player.isPreparing()
  const handlePause = () => {
    player.pause()
    props.onPause?.()
  }
  return (
    <>
      <div aria-label="Summary" role="group">
        <SummaryPlayButton
          currentTrack={player.currentTrack()}
          isPlaying={player.isPlaying()}
          isPreparing={isPreparing()}
          onPause={handlePause}
          sceneStyle={props.sceneStyle}
        />
      </div>
      <div aria-label="Expanded" role="group">
        <ExpandedPlayerControls
          canNavigateNextTrack={false}
          canNavigatePreviousTrack={false}
          hasTrack={player.currentTrack() !== undefined}
          isPlaying={player.isPlaying()}
          isPreparing={isPreparing()}
          onNextTrack={() => undefined}
          onPause={handlePause}
          onPreviousTrack={() => undefined}
          onRepeatModeChange={() => undefined}
          onShuffleChange={() => undefined}
          repeatMode="repeat-all"
          sceneStyle={props.sceneStyle}
          shuffleEnabled={false}
        />
      </div>
      <div hidden aria-hidden="true" data-testid="media-label-baseline">
        <Show when={!isPreparing()}>
          <media-play-button
            aria-label={player.isPlaying() ? m.player_pause() : m.player_play()}
            attr:notooltip=""
          />
        </Show>
      </div>
    </>
  )
}

export const PlaybackControls = (props: PlaybackControlsProps) => {
  const sampleRate = 24000
  const durationSeconds = 30
  const bytesPerSample = 2
  const sourceBlob = new Blob(
    [
      createPcm16WavBuffer({
        channels: 1,
        dataBytes: sampleRate * durationSeconds * bytesPerSample,
        sampleRate,
      }),
    ],
    {type: 'audio/wav'},
  )
  const track = {
    artist: 'Artist',
    durationSeconds,
    id: 'one',
    source: '',
    sourceBlob,
    title: 'Track',
  }
  return (
    <PreferenceProvider>
      <PTooltipProvider>
        <div aria-label="Playback fixture" class={props.compact ? 'w-64' : 'w-120'} role="group">
          <MediaPlayer
            class={CLASSES.player}
            stopOnUnmount
            tracks={props.hasTrack === false ? [] : [track]}
          >
            <PlaybackControlsContent
              isPreparing={props.isPreparing}
              onPause={props.onPause}
              sceneStyle={props.sceneStyle}
            />
          </MediaPlayer>
        </div>
        <PTooltipContent />
      </PTooltipProvider>
    </PreferenceProvider>
  )
}
