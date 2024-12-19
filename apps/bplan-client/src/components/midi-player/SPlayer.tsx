import {cva} from 'class-variance-authority'
import {createMemo, createSignal, JSX, Show} from 'solid-js'
import {MusicInfo} from './SFileItem'
import {SFileList} from './SFileList'
import {SMidiFileInput} from './SMidiFileInput'
import {SPlayerButton} from './SPlayerButton'

export interface SPlayerProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'onPlay'> {
  onPause?: () => void
  onPlay?: (payload: MusicInfo, targetId: string) => void
  onStop?: () => void
}

export const SPlayer = (props: SPlayerProps) => {
  const [playingId, setPlayingId] = createSignal('')
  const [playList, setPlayList] = createSignal<MusicInfo[]>([])
  const [selectedId, setSelectedId] = createSignal<string>('')

  const handleAddPlayItem = (payload: MusicInfo[]) => {
    // first select
    if (playList().length === 0 && payload.length > 0) {
      setSelectedId(payload[0].id)
    }
    setPlayList((prev) => {
      return [...prev, ...payload]
    })
  }

  const isPlaying = createMemo(() => {
    const _playingId = playingId()
    const isPlaying = Boolean(_playingId)
    return isPlaying && _playingId === selectedId()
  })

  const handleSelected = (id: string) => {
    setSelectedId(id)
  }

  const handlePlayOrPause = () => {
    const _isPlaying = isPlaying()
    if (_isPlaying) {
      props.onPause?.()
      setPlayingId('')
    } else {
      const _selectedId = selectedId()
      const payload = playList().find((item) => item.id === _selectedId)
      if (payload) {
        props.onPlay?.(payload, _selectedId)
      }
      setPlayingId(selectedId())
    }
  }

  const handleStop = () => {
    // stop
    props.onStop?.()
    setPlayingId('')
  }

  const playStyle = cva('block text-32px', {
    variants: {
      isPlaying: {
        false: 'i-hugeicons:play',
        true: 'i-hugeicons:pause',
      },
    },
  })

  return (
    <>
      <Show when={playList().length > 0}>
        <SFileList
          list={playList()}
          class="max-h-102px"
          selectedId={selectedId()}
          onSelect={handleSelected}
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
        <SMidiFileInput class="min-w-44px px-2" onAdd={handleAddPlayItem} />
      </div>
    </>
  )
}
