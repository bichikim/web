import {cva, cx} from 'class-variance-authority'
import {createMemo, JSX, mergeProps, Show} from 'solid-js'
import {MusicInfo} from './SFileItem'
import {SFileList} from './SFileList'
import {SMidiFileInput} from './SMidiFileInput'
import {SPlayerButton} from './SPlayerButton'
import {SRepeatButton} from './SRepeatButton'
import {RepeatType} from './types'
import {SSeeker} from './SSeeker'

export type LinkType = 'piano' | 'music'

export interface SPlayerControllerProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay' | 'onSelect' | 'onPlaying'> {
  isSuspend?: boolean
  linkType?: LinkType
  onAddItem?: (payload: MusicInfo[]) => void
  onChangeRepeat?: (value: RepeatType) => void
  onDeleteItem?: (id: string) => void
  onLink?: (value: LinkType) => void
  onPlay?: (id: string) => void
  onResume?: () => void
  onSeek?: (time: number) => void
  onSelect?: (id: string) => void
  onSetting?: () => void
  onStop?: () => void
  onSuspend?: () => void
  playList?: MusicInfo[]
  playedTime?: number
  playingId?: string
  repeat?: RepeatType
  selectedId?: string
  totalDuration?: number
}

const playStyle = cva('block text-8', {
  variants: {
    isPlaying: {
      false: 'i-tabler:player-play',
      true: 'i-tabler:player-pause',
    },
  },
})

export const SPlayerController = (props: SPlayerControllerProps) => {
  const innerProps = mergeProps(
    {
      linkType: 'piano' as const,
      playList: [],
      playedTime: 0,
      playingId: '',
      repeat: 'no' as const,
      selectedId: '',
      totalDuration: 0,
    },
    props,
  )

  const isSuspend = createMemo(() => {
    return Boolean(innerProps.isSuspend)
  })

  const isPlayingButton = createMemo(() => {
    return (
      !isSuspend() &&
      innerProps.playingId === innerProps.selectedId &&
      innerProps.playedTime < innerProps.totalDuration
    )
  })

  const isEnd = createMemo(() => {
    return (
      Boolean(innerProps.playingId) && innerProps.totalDuration <= innerProps.playedTime
    )
  })

  const handleAddPlayItem = (payload: MusicInfo[]) => {
    innerProps.onAddItem?.(payload)
  }

  const handlePlayOrPause = () => {
    if (innerProps.selectedId === '') {
      innerProps.onPlay?.(innerProps.selectedId)

      return
    }

    if (innerProps.selectedId === innerProps.playingId && !isEnd()) {
      if (innerProps.isSuspend) {
        innerProps.onResume?.()
      } else {
        innerProps.onSuspend?.()
      }
    } else {
      innerProps.onPlay?.(innerProps.selectedId)
    }
  }

  const handleLink = () => {
    innerProps.onLink?.(innerProps.linkType)
  }

  return (
    <>
      <Show when={innerProps.playList.length > 0}>
        <SFileList
          list={innerProps.playList}
          isSuspend={isSuspend()}
          class="min-h-0 flex-shrink-1"
          selectedId={innerProps.selectedId}
          onSelect={innerProps.onSelect}
          onDelete={innerProps.onDeleteItem}
          onPlay={innerProps.onPlay}
          onSuspend={innerProps.onSuspend}
          onResume={innerProps.onResume}
          playedTime={innerProps.playedTime}
          playingId={innerProps.playingId}
        />
      </Show>
      <SSeeker
        class=":uno: flex-1 min-h-2 relative rd-1 overflow-hidden b-0 w-full touch-none"
        playedTime={innerProps.playedTime}
        totalDuration={innerProps.totalDuration}
        onSeek={innerProps.onSeek}
      />
      <section class="flex gap-2">
        <SPlayerButton
          class="min-w-11"
          onClick={handlePlayOrPause}
          title={isPlayingButton() ? 'play' : 'pause'}
        >
          <span class={playStyle({isPlaying: isPlayingButton()})} />
        </SPlayerButton>
        <SPlayerButton class="min-w-11 min-h-9" onClick={innerProps.onStop} title="stop">
          <span class="block i-tabler:player-stop text-9" />
        </SPlayerButton>
        <SRepeatButton
          class="min-w-11"
          onChangeRepeat={innerProps.onChangeRepeat}
          repeat={innerProps.repeat}
          hasManyItems={innerProps.playList.length > 1}
        />
        <SMidiFileInput class="min-w-11" onAdd={handleAddPlayItem} />
        <SPlayerButton
          type="anchor-button"
          tabIndex="0"
          class="min-w-11"
          onClick={handleLink}
          title={innerProps.linkType === 'music' ? 'get music more' : 'piano'}
        >
          <span
            class={cx(
              'block text-9',
              innerProps.linkType === 'music' ? 'i-tabler:music-plus' : 'i-tabler:piano',
            )}
          />
        </SPlayerButton>
        <SPlayerButton class="min-w-11" onClick={innerProps.onSetting} title="setting">
          <span class="block i-tabler:settings text-8" />
        </SPlayerButton>
      </section>
    </>
  )
}
