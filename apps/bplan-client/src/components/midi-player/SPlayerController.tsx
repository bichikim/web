import {cva} from 'class-variance-authority'
import {createEffect, createMemo, createSignal, JSX, mergeProps, Show} from 'solid-js'
import {MusicInfo} from './SFileItem'
import {SFileList} from './SFileList'
import {SMidiFileInput} from './SMidiFileInput'
import {SPlayerButton} from './SPlayerButton'
import {RepeatType, SRepeatButton} from './SRepeatButton'

export interface PlayingPayload {
  leftTime: number
  totalTime: number
}

export interface MountMusicInfo
  extends Required<Pick<MusicInfo, 'id' | 'midi'>>,
    Omit<MusicInfo, 'id' | 'midi'> {}

export interface SPlayerControllerProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay' | 'onSelect' | 'onPlaying'> {
  isSuspend?: boolean
  leftTime?: number
  onAddItem?: (payload: MusicInfo[]) => void
  onDeleteItem?: (id: string) => void
  onMount?: (id: string) => void
  onPlaying?: (value: boolean) => void
  onResume?: () => void
  onSelect?: (id: string) => void
  onStop?: () => void
  onSuspend?: () => void
  playList?: MusicInfo[]
  playingId?: string
  selectedId?: string
}

const playStyle = cva('block text-32px', {
  variants: {
    isPlaying: {
      false: 'i-hugeicons:play',
      true: 'i-hugeicons:pause',
    },
  },
})

// eslint-disable-next-line max-lines-per-function
export const SPlayerController = (props: SPlayerControllerProps) => {
  const innerProps = mergeProps(
    {
      leftTime: 0,
      playList: [],
      playingId: '',
      selectedId: '',
    },
    props,
  )
  const forecastEstimationMargin = 1000
  const [repeat, setRepeat] = createSignal<RepeatType>('no')

  const handleAddPlayItem = (payload: MusicInfo[]) => {
    innerProps.onAddItem?.(payload)
  }

  const isPlaying = createMemo(() => {
    return Boolean(innerProps.playingId) && !isSuspend()
  })

  const isSuspend = createMemo(() => {
    return Boolean(innerProps.isSuspend)
  })

  const isPlayingButton = createMemo(() => {
    return !isSuspend && innerProps.playingId === innerProps.selectedId
  })

  const handleSelected = (id: string) => {
    innerProps.onSelect?.(id)
  }

  const handlePlay = (id: string) => {
    innerProps.onMount?.(id)
  }

  // const currentPlayingMusic = createMemo(() => {
  //   return (innerProps.playList ?? []).find((item) => item.id === innerProps.playingId)
  // })

  // const currentSelectedMusic = createMemo(() => {
  //   return (innerProps.playList ?? []).find((item) => item.id === innerProps.selectedId)
  // })
  //
  // const isEnd = createMemo(() => {
  //   const payload = currentPlayingMusic()
  //   if (!payload || !payload.totalDuration) {
  //     return true
  //   }
  //   return (
  //     payload.totalDuration <
  //     Math.ceil(innerProps.leftTime * forecastEstimationMargin) / forecastEstimationMargin
  //   )
  // })

  // const getNextItem = (id: string, repeat: RepeatType) => {
  //   const _playLoad = innerProps.playList
  //   const index = _playLoad.findIndex((item) => item.id === id)
  //   if (index === -1) {
  //     return repeat === 'all' ? _playLoad[0] : undefined
  //   }
  //   const nextIndex = index + 1
  //   const item = _playLoad[nextIndex]
  //
  //   if (!item) {
  //     return repeat === 'all' ? _playLoad[0] : undefined
  //   }
  //   return item
  // }

  const handleResume = () => {
    innerProps.onResume?.()
  }

  const handlePause = () => {
    innerProps.onSuspend?.()
  }

  const handlePlayOrPause = () => {
    if (innerProps.selectedId === innerProps.playingId) {
      if (innerProps.isSuspend) {
        handleResume()
      } else {
        handlePause()
      }
    } else {
      handlePlay(innerProps.selectedId)
    }
  }

  const handleStop = () => {
    // stop
    innerProps.onStop?.()
  }

  const handleChangeRepeat = (value: RepeatType) => {
    setRepeat(value)
  }

  // const handleTryRepeat = () => {
  //   const _repeat = repeat()
  //   const _currentPlayingMusic = currentSelectedMusic()
  //   if (_repeat === 'one' && _currentPlayingMusic) {
  //     handlePlay(_currentPlayingMusic)
  //     return
  //   }
  //   const nextItem = getNextItem(innerProps.playingId, _repeat)
  //   if (nextItem) {
  //     handlePlay(nextItem)
  //   }
  // }

  const handleDelete = (id: string) => {
    innerProps.onDeleteItem?.(id)
  }

  // watch music is ended
  // createEffect(() => {
  //   const _isEnd = isEnd()
  //
  //   if (_isEnd) {
  //     console.log('handleTryRepeat')
  //     handleTryRepeat()
  //   }
  //
  //   return _isEnd
  // })

  return (
    <>
      <Show when={innerProps.playList.length > 0}>
        <SFileList
          list={innerProps.playList}
          class="max-h-124px"
          selectedId={innerProps.selectedId}
          onSelect={handleSelected}
          onDelete={handleDelete}
          leftTime={innerProps.leftTime}
          playingId={innerProps.playingId}
        />
      </Show>
      <div class="flex gap-2 p-2">
        <SPlayerButton
          class="min-w-44px min-h-36px bg-gray-100"
          onClick={handlePlayOrPause}
          aria-label={isPlayingButton() ? 'play' : 'pause'}
        >
          <span class={playStyle({isPlaying: isPlayingButton()})} />
        </SPlayerButton>

        <SPlayerButton
          class="min-w-44px min-h-36px bg-gray-100"
          onClick={handleStop}
          aria-label="stop"
        >
          <span class="block i-hugeicons:stop text-32px" />
        </SPlayerButton>
        <SRepeatButton
          class="min-w-44px"
          onChangeRepeat={handleChangeRepeat}
          repeat={repeat()}
          hasManyItems={innerProps.playList.length > 1}
        />
        <SMidiFileInput class="min-w-44px px-2" onAdd={handleAddPlayItem} />
      </div>
    </>
  )
}
