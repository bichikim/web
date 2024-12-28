import {cva} from 'class-variance-authority'
import {createMemo, JSX, mergeProps, Show} from 'solid-js'
import {MusicInfo} from './SFileItem'
import {SFileList} from './SFileList'
import {SMidiFileInput} from './SMidiFileInput'
import {SPlayerButton} from './SPlayerButton'
import {SRepeatButton} from './SRepeatButton'
import {RepeatType} from './types'

export interface SPlayerControllerProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay' | 'onSelect' | 'onPlaying'> {
  isSuspend?: boolean
  leftTime?: number
  onAddItem?: (payload: MusicInfo[]) => void
  onChangeRepeat?: (value: RepeatType) => void
  onDeleteItem?: (id: string) => void
  onMount?: (id: string) => void
  onPlaying?: (value: boolean) => void
  onResume?: () => void
  onSelect?: (id: string) => void
  onStop?: () => void
  onSuspend?: () => void
  playList?: MusicInfo[]
  playingId?: string
  repeat?: RepeatType
  selectedId?: string
  totalDuration?: number
}

const playStyle = cva('block text-32px', {
  variants: {
    isPlaying: {
      false: 'i-hugeicons:play',
      true: 'i-hugeicons:pause',
    },
  },
})

export const SPlayerController = (props: SPlayerControllerProps) => {
  const innerProps = mergeProps(
    {
      leftTime: 0,
      playList: [],
      playingId: '',
      repeat: 'no' as const,
      selectedId: '',
      totalDuration: 0,
    },
    props,
  )

  const handleAddPlayItem = (payload: MusicInfo[]) => {
    innerProps.onAddItem?.(payload)
  }

  const isSuspend = createMemo(() => {
    return Boolean(innerProps.isSuspend)
  })

  const isPlayingButton = createMemo(() => {
    return (
      !isSuspend() &&
      innerProps.playingId === innerProps.selectedId &&
      innerProps.leftTime < innerProps.totalDuration
    )
  })

  const handleSelected = (id: string) => {
    innerProps.onSelect?.(id)
  }

  const handlePlay = (id: string) => {
    innerProps.onMount?.(id)
  }

  const handleResume = () => {
    innerProps.onResume?.()
  }

  const handlePause = () => {
    innerProps.onSuspend?.()
  }

  const isEnd = createMemo(() => {
    return (
      Boolean(innerProps.playingId) && innerProps.totalDuration <= innerProps.leftTime
    )
  })

  const handlePlayOrPause = () => {
    if (innerProps.selectedId === innerProps.playingId && !isEnd()) {
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
    innerProps.onChangeRepeat?.(value)
  }

  const handleDelete = (id: string) => {
    innerProps.onDeleteItem?.(id)
  }

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
      <div class="flex gap-2">
        <SPlayerButton
          class="min-w-44px min-h-36px bg-gray-100"
          onClick={handlePlayOrPause}
          title={isPlayingButton() ? 'play' : 'pause'}
        >
          <span class={playStyle({isPlaying: isPlayingButton()})} />
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
          repeat={innerProps.repeat}
          hasManyItems={innerProps.playList.length > 1}
        />
        <SMidiFileInput class="min-w-44px px-2" onAdd={handleAddPlayItem} />
      </div>
    </>
  )
}
