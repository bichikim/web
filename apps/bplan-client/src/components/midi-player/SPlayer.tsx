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

  return (
    <SPlayerController
      {...restProps}
      playList={playList()}
      selectedId={selectedId()}
      onSuspend={handleSuspend}
      onStop={handleStop}
      onResume={handleResume}
      onMountSample={handleMountSample}
      onAddItem={handleAddPlayItem}
      onSelect={handleSelect}
    />
  )
}
