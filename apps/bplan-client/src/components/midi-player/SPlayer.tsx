import {createEffect, createMemo, createSignal, mergeProps, splitProps} from 'solid-js'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {SampleStart} from 'src/components/midi-player/types'
import {SplendidGrandPianoController, SplendidGrandPianoState} from 'src/use/instruments'
import {
  MountMusicInfo,
  SPlayerController,
  SPlayerControllerProps,
} from './SPlayerController'

export interface SPlayerProps extends Pick<SPlayerControllerProps, 'leftTime'> {
  pianoController?: SplendidGrandPianoController
  pianoState?: SplendidGrandPianoState
}

export const SPlayer = (props: SPlayerProps) => {
  const defaultProps = mergeProps(
    {
      pianoState: {
        leftTime: 0,
        loaded: false,
        playingId: '',
        startedAt: 0,
        suspended: false,
        totalDuration: 0,
      },
    },
    props,
  )
  const [innerProps, restProps] = splitProps(defaultProps, [
    'pianoController',
    'pianoState',
  ])
  const [playList, setPlayList] = createSignal<MusicInfo[]>([])
  const [selectedId, setSelectedId] = createSignal<string>('')

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

  const handleMount = (id: string) => {
    const info = playList().find((item) => item.id === id)
    if (!info) {
      return
    }
    innerProps.pianoController?.mount(info)
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
      playingId={innerProps.pianoState.playingId}
      isSuspend={innerProps.pianoState.suspended}
      selectedId={selectedId()}
      onSuspend={handleSuspend}
      onStop={handleStop}
      onDeleteItem={handleDelete}
      onResume={handleResume}
      onAddItem={handleAddPlayItem}
      onSelect={handleSelect}
      onMount={handleMount}
    />
  )
}
