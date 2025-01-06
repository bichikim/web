import {
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  Show,
  splitProps,
} from 'solid-js'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {RepeatType} from 'src/components/midi-player/types'
import {SplendidGrandPianoController, SplendidGrandPianoState} from 'src/use/instruments'
import {SPlayerController, SPlayerControllerProps} from './SPlayerController'

export interface SPlayerProps extends Pick<SPlayerControllerProps, 'leftTime'> {
  initMusics?: MusicInfo[]
  isHidden?: boolean
  onMusicsChange?: (musics: MusicInfo[]) => void
  onSetting?: () => void
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
    'onSetting',
    'isHidden',
    'initMusics',
    'onMusicsChange',
  ])
  const [playList, setPlayList] = createSignal<MusicInfo[]>(innerProps.initMusics ?? [])
  const [selectedId, setSelectedId] = createSignal<string>('')
  const [repeat, setRepeat] = createSignal<RepeatType>('no')

  createEffect(() => {
    innerProps.onMusicsChange?.(playList())
  })

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

  const handlePlay = (id: string) => {
    const info = playList().find((item) => item.id === id)

    if (!info) {
      const [firstItem] = playList()

      if (firstItem) {
        setSelectedId(firstItem.id)
        innerProps.pianoController?.play(firstItem)
      }

      return
    }

    innerProps.pianoController?.play(info)
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

  const handleChangeRepeat = (value: RepeatType) => {
    setRepeat(value)
  }

  const isEnd = createMemo(() => {
    const {playingId, totalDuration, leftTime} = defaultProps.pianoState

    return Boolean(playingId) && totalDuration <= leftTime
  })

  const getNextItem = (id: string, repeat: RepeatType) => {
    const _playLoad = playList()
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

  const handleTryRepeat = () => {
    const _repeat = repeat()

    if (_repeat === 'one' && innerProps.pianoState.playingId) {
      handlePlay(innerProps.pianoState.playingId)

      return
    }

    const nextItem = getNextItem(innerProps.pianoState.playingId, _repeat)

    if (nextItem) {
      innerProps.pianoController?.play(nextItem)
    }
  }

  const handleSeek = (time: number) => {
    innerProps.pianoController?.seek(time)
  }

  createEffect(() => {
    if (isEnd()) {
      handleTryRepeat()
    }

    return isEnd()
  })

  return (
    <Show when={!innerProps.isHidden}>
      <SPlayerController
        {...restProps}
        repeat={repeat()}
        totalDuration={innerProps.pianoState.totalDuration}
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
        onPlay={handlePlay}
        onSeek={handleSeek}
        onSetting={innerProps.onSetting}
        onChangeRepeat={handleChangeRepeat}
      />
    </Show>
  )
}
