import {cva} from 'class-variance-authority'
import {createEffect, createMemo, createSignal, JSX, mergeProps, Show} from 'solid-js'
import {SampleStart} from 'src/components/midi-player/types'
import {MusicInfo} from './SFileItem'
import {SFileList} from './SFileList'
import {SMidiFileInput} from './SMidiFileInput'
import {SPlayerButton} from './SPlayerButton'
import {RepeatType, SRepeatButton} from './SRepeatButton'

const filePlayLast = Symbol('file-play')

export interface SPlayerControllerProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay' | 'onSelect'> {
  leftTime?: number
  onAddItem?: (payload: MusicInfo[]) => void
  onDeleteItem?: (id: string) => void
  onMountSample?: (
    payload: SampleStart & {[filePlayLast]?: boolean},
    targetId: string,
  ) => void
  onResume?: () => void
  onSelect?: (id: string) => void
  onStop?: () => void
  onSuspend?: () => void
  playList?: MusicInfo[]
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
      selectedId: '',
    },
    props,
  )
  let _targetId = ''
  const forecastEstimationMargin = 1000
  const [playingId, setPlayingId] = createSignal('')
  const [repeat, setRepeat] = createSignal<RepeatType>('no')

  const handleAddPlayItem = (payload: MusicInfo[]) => {
    innerProps.onAddItem?.(payload)
  }

  const isPlaying = createMemo(() => {
    const _playingId = playingId()
    const isPlaying = Boolean(_playingId)
    return isPlaying && _playingId === innerProps.selectedId
  })

  const handleSelected = (id: string) => {
    innerProps.onSelect?.(id)
  }

  const handlePlay = (payload: MusicInfo, targetId: string) => {
    if (isPlaying() && playingId() === targetId) {
      return innerProps.onResume?.()
    }
    innerProps.onStop?.()
    innerProps.onResume?.()
    const {midi} = payload

    // eslint-disable-next-line prefer-destructuring
    const onMountSample = innerProps.onMountSample

    if (!midi || !onMountSample) {
      return
    }
    for (const notes of midi) {
      for (const note of notes) {
        onMountSample(note, targetId)
      }
    }
    setPlayingId(targetId)
  }

  const currentPlayingMusic = createMemo(() => {
    return (innerProps.playList ?? []).find((item) => item.id === innerProps.selectedId)
  })

  const isEnd = createMemo(() => {
    const payload = currentPlayingMusic()
    if (!payload || !payload.totalDuration) {
      return true
    }
    return (
      payload.totalDuration <
      Math.ceil(innerProps.leftTime * forecastEstimationMargin) / forecastEstimationMargin
    )
  })

  const getNextItem = (id: string, repeat: RepeatType) => {
    const _playLoad = innerProps.playList
    const index = _playLoad.findIndex((item) => item.id === id)
    if (index === -1) {
      return repeat === 'all' ? _playLoad[0] : undefined
    }
    const nextIndex = index + 1
    const item = _playLoad[nextIndex]

    if (!item) {
      return repeat === 'all' ? _playLoad[0] : undefined
    }
    return item
  }

  const handlePause = () => {
    innerProps.onSuspend?.()
  }

  const handlePlayOrPause = () => {
    const _isPlaying = isPlaying()
    const _selectedId = innerProps.selectedId
    if (_isPlaying && _selectedId === _targetId) {
      handlePause()
      _targetId = ''
    } else {
      const payload = currentPlayingMusic()
      if (payload) {
        handlePlay(payload, _selectedId)
        _targetId = _selectedId
      }
    }
  }

  const handleInit = () => {
    setPlayingId('')
    _targetId = ''
  }

  const handleStop = () => {
    // stop
    innerProps.onStop?.()
    handleInit()
  }

  const handleChangeRepeat = (value: RepeatType) => {
    setRepeat(value)
  }

  const handleTryRepeat = () => {
    const _repeat = repeat()
    const _currentPlayingMusic = currentPlayingMusic()
    if (_repeat === 'one' && _currentPlayingMusic) {
      handlePlay(_currentPlayingMusic, playingId())
      return
    }
    const nextItem = getNextItem(playingId(), _repeat)
    if (nextItem) {
      handlePlay(nextItem, nextItem.id)
    } else {
      handleInit()
    }
  }

  const handleDelete = (id: string) => {
    props.onDeleteItem?.(id)
  }

  // watch music is ended
  createEffect(() => {
    const _isEnd = isEnd()

    if (_isEnd) {
      handleTryRepeat()
    }

    return _isEnd
  })

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
          playingId={playingId()}
        />
      </Show>
      <div class="flex gap-2 p-2">
        <SPlayerButton
          class="min-w-44px min-h-36px bg-gray-100"
          onClick={handlePlayOrPause}
          title={isPlaying() ? 'pause' : 'play'}
        >
          <span class={playStyle({isPlaying: isPlaying()})} />
        </SPlayerButton>

        <SPlayerButton
          class="min-w-44px min-h-36px bg-gray-100"
          onClick={handleStop}
          title="stop"
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
