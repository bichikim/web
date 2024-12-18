import {SPlayerButton} from './SPlayerButton'
import {SFileList} from './SFileList'
import {cva, cx} from 'class-variance-authority'
import {SMidiFileInput} from './SMidiFileInput'
import {MusicInfo} from './SFileItem'
import {createMemo, createSignal, Show} from 'solid-js'

export interface SPlayerProps {
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
    <div class="min-w-350px bg-white p-2 rd-2 flex flex-col relative max-w-500px">
      <Show when={playList().length > 0}>
        <SFileList
          list={playList()}
          class="max-h-102px"
          selectedId={selectedId()}
          onSelect={handleSelected}
        />
      </Show>
      <div class="flex gap-2 p-2">
        <SPlayerButton class="min-w-44px bg-gray-100" onClick={handlePlayOrPause}>
          <span class={playStyle({isPlaying: isPlaying()})} />
        </SPlayerButton>

        <SPlayerButton class="min-w-44px bg-gray-100" onClick={handleStop}>
          <span class="block i-hugeicons:stop text-32px" />
        </SPlayerButton>
        <SMidiFileInput class="min-w-44px" onAdd={handleAddPlayItem} />
      </div>
      <div
        class={cx(
          'absolute top--20px left--20px w-36px h-36px flex items-center justify-center rd-6px',
          'bg-red cursor-pointer',
        )}
      >
        <span class="inline-block i-hugeicons:cancel-02 text-28px text-white" />
      </div>
    </div>
  )
}
