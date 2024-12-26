import {createEffect, createSignal, splitProps} from 'solid-js'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {SampleStart} from 'src/components/midi-player/types'
import {SplendidGrandPianoController} from 'src/use/instruments'
import {
  MountMusicInfo,
  SPlayerController,
  SPlayerControllerProps,
} from './SPlayerController'

export interface SPlayerProps extends Pick<SPlayerControllerProps, 'leftTime'> {
  onPlaying?: (value: boolean) => void
  pianoController?: SplendidGrandPianoController
}

export const SPlayer = (props: SPlayerProps) => {
  const [innerProps, restProps] = splitProps(props, ['pianoController', 'onPlaying'])
  const [playList, setPlayList] = createSignal<MusicInfo[]>([])
  const [selectedId, setSelectedId] = createSignal<string>('')
  const [playingId, setPlayingId] = createSignal('')
  const [isSuspend, setIsSuspend] = createSignal(false)

  const handleMountSample = (payload: SampleStart, targetId: string) => {
    innerProps.pianoController?.mount({
      ...payload,
      id: targetId,
    })
  }

  const handleStop = async () => {
    innerProps.pianoController?.stop()
    setPlayingId('')
  }

  const handleResume = () => {
    innerProps.pianoController?.resume()
    setIsSuspend(false)
  }

  const handleSuspend = () => {
    innerProps.pianoController?.suspend()
    setIsSuspend(true)
  }

  const handleAddPlayItem = (payload: MusicInfo[]) => {
    // first select
    if (playList().length === 0 && payload.length > 0) {
      setSelectedId(payload[0].id)
    }
    setPlayList((prev) => {
      return [...prev, ...payload]
    })
  }

  const handleSelect = (id: string) => {
    setSelectedId(id)
  }

  const handleDelete = (id: string) => {
    const _playList = playList()
    const index = _playList.findIndex((item) => item.id === id)
    if (index === -1) {
      return
    }
    if (selectedId() === id) {
      const prevItem = _playList[index - 1]
      const nextItem = _playList[index + 1]
      if (prevItem) {
        setSelectedId(prevItem.id)
      } else if (nextItem) {
        setSelectedId(nextItem.id)
      } else {
        setSelectedId('')
      }
    }
    setPlayList((prev) => {
      return [...prev.slice(0, index), ...prev.slice(index + 1)]
    })
  }

  createEffect(() => {
    const value = Boolean(playingId())
    innerProps.onPlaying?.(value)
    return value
  })

  const handlePlay = (info: MountMusicInfo) => {
    const {midi, id} = info

    for (const notes of midi) {
      for (const note of notes) {
        handleMountSample(note, id)
      }
    }
    setPlayingId(id)
    setIsSuspend(false)
  }

  return (
    <SPlayerController
      {...restProps}
      playList={playList()}
      playingId={playingId()}
      isSuspend={isSuspend()}
      selectedId={selectedId()}
      onSuspend={handleSuspend}
      onStop={handleStop}
      onDeleteItem={handleDelete}
      onResume={handleResume}
      onAddItem={handleAddPlayItem}
      onSelect={handleSelect}
      onMount={handlePlay}
    />
  )
}
