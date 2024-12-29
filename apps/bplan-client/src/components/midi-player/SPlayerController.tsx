import {cva} from 'class-variance-authority'
import {createMemo, JSX, mergeProps, Show} from 'solid-js'
import {MusicInfo} from './SFileItem'
import {SFileList} from './SFileList'
import {SMidiFileInput} from './SMidiFileInput'
import {SPlayerButton} from './SPlayerButton'
import {SRepeatButton} from './SRepeatButton'
import {RepeatType} from './types'
import {SSeeker} from './SSeeker'

export interface SPlayerControllerProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay' | 'onSelect' | 'onPlaying'> {
  isSuspend?: boolean
  leftTime?: number
  onAddItem?: (payload: MusicInfo[]) => void
  onChangeRepeat?: (value: RepeatType) => void
  onDeleteItem?: (id: string) => void
  onPlay?: (id: string) => void
  onResume?: () => void
  onSeek?: (time: number) => void
  onSelect?: (id: string) => void
  onSetting?: () => void
  onStop?: () => void
  onSuspend?: () => void
  playList?: MusicInfo[]
  playingId?: string
  repeat?: RepeatType
  selectedId?: string
  totalDuration?: number
}

const playStyle = cva('block text-8', {
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

  const isEnd = createMemo(() => {
    return (
      Boolean(innerProps.playingId) && innerProps.totalDuration <= innerProps.leftTime
    )
  })

  const handlePlayOrPause = () => {
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

  return (
    <>
      <Show when={innerProps.playList.length > 0}>
        <SFileList
          list={innerProps.playList}
          class="max-h-31"
          selectedId={innerProps.selectedId}
          onSelect={innerProps.onSelect}
          onDelete={innerProps.onDeleteItem}
          leftTime={innerProps.leftTime}
          playingId={innerProps.playingId}
        />
      </Show>
      <SSeeker
        class="flex-1 min-h-2 relative rd-1 overflow-hidden b-0 w-full touch-none"
        leftTime={innerProps.leftTime}
        totalDuration={innerProps.totalDuration}
        onSeek={innerProps.onSeek}
      />
      <section class="flex gap-2">
        <SPlayerButton
          class="min-w-11 min-h-9 bg-gray-100"
          onClick={handlePlayOrPause}
          title={isPlayingButton() ? 'play' : 'pause'}
        >
          <span class={playStyle({isPlaying: isPlayingButton()})} />
        </SPlayerButton>

        <SPlayerButton
          class="min-w-11 min-h-9 bg-gray-100"
          onClick={innerProps.onStop}
          title="stop"
        >
          <span class="block i-hugeicons:stop text-9" />
        </SPlayerButton>
        <SRepeatButton
          class="min-w-11"
          onChangeRepeat={innerProps.onChangeRepeat}
          repeat={innerProps.repeat}
          hasManyItems={innerProps.playList.length > 1}
        />
        <SMidiFileInput class="min-w-11 px-2" onAdd={handleAddPlayItem} />
        <SPlayerButton
          class="min-w-11 min-h-9 bg-gray-100"
          onClick={innerProps.onSetting}
          title="setting"
        >
          <span class="block i-hugeicons:setting-07 text-8" />
        </SPlayerButton>
      </section>
    </>
  )
}
