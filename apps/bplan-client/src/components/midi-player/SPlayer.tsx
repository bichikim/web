import {createSignal, splitProps} from 'solid-js'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {SampleStart} from 'src/components/midi-player/types'
import {SplendidGrandPianoController} from 'src/use/instruments'
import {SPlayerController, SPlayerControllerProps} from './SPlayerController'

export interface SPlayerProps extends Pick<SPlayerControllerProps, 'leftTime'> {
  pianoController?: SplendidGrandPianoController
}

export const SPlayer = (props: SPlayerProps) => {
  const [innerProps, restProps] = splitProps(props, ['pianoController'])
  const [playList, setPlayList] = createSignal<MusicInfo[]>([])
  const [selectedId, setSelectedId] = createSignal<string>('')

  const handleMountSample = (payload: SampleStart, targetId: string) => {
    innerProps.pianoController?.mount({
      ...payload,
      id: targetId,
    })
  }

  const handleStop = async () => {
    innerProps.pianoController?.stop()
  }

  const handleResume = () => {
    innerProps.pianoController?.resume()
  }

  const handleSuspend = () => {
    innerProps.pianoController?.suspend()
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

  return (
    <SPlayerController
      {...restProps}
      playList={playList()}
      selectedId={selectedId()}
      onSuspend={handleSuspend}
      onStop={handleStop}
      onDeleteItem={handleDelete}
      onResume={handleResume}
      onMountSample={handleMountSample}
      onAddItem={handleAddPlayItem}
      onSelect={handleSelect}
    />
  )
}
