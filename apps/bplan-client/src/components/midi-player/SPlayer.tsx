import {
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  Show,
  splitProps,
  untrack,
} from 'solid-js'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {RepeatType} from 'src/components/midi-player/types'
import {SplendidGrandPianoController, SplendidGrandPianoState} from 'src/use/instruments'
import {SPlayerController, SPlayerControllerProps} from './SPlayerController'

export interface SPlayerProps
  extends Omit<SPlayerControllerProps, 'onSelect' | 'onSelect' | 'onSuspend'> {
  initMusics?: MusicInfo[]
  isShow?: boolean
  onMusicsChange?: (musics: MusicInfo[]) => void
  onSetting?: () => void
  pianoController?: SplendidGrandPianoController
  playState?: SplendidGrandPianoState
}

/**
 * MIDI Player Component
 *
 * A player component for playing and controlling MIDI files.
 * Provides functionality for playlist management, repeat playback, pause/resume etc.
 *
 * @example
 * ```tsx
 * <SPlayer
 *   initMusics={[]}
 *   pianoController={pianoController}
 *   pianoState={pianoState}
 *   onMusicsChange={(musics) => console.log('Playlist changed:', musics)}
 * />
 * ```
 *
 * @param props {SPlayerProps} The props for the player component
 * @prop {MusicInfo[]} [initMusics] - Initial playlist of music files
 * @prop {boolean} [isHidden] - Whether the player should be hidden
 * @prop {(musics: MusicInfo[]) => void} [onMusicsChange] - Callback fired when playlist changes
 * @prop {() => void} [onSetting] - Callback fired when settings button is clicked
 * @prop {SplendidGrandPianoController} [pianoController] - Piano controller instance
 * @prop {SplendidGrandPianoState} [pianoState] - Current state of the piano
 */
export const SPlayer = (props: SPlayerProps) => {
  const defaultProps = mergeProps(
    {
      playState: {
        leftTime: 0,
        loaded: false,
        playedTime: 0,
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
    'playState',
    'onSetting',
    'initMusics',
    'onMusicsChange',
    'isShow',
  ])

  const [playList, setPlayList] = createSignal<MusicInfo[]>(
    untrack(() => innerProps.initMusics ?? []),
  )
  const [selectedId, setSelectedId] = createSignal<string>('')
  const [repeat, setRepeat] = createSignal<RepeatType>('no')

  const handleMusicsChange = () => {
    innerProps.onMusicsChange?.(playList())
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
    handleMusicsChange()
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
    handleMusicsChange()
  }

  const handleChangeRepeat = (value: RepeatType) => {
    setRepeat(value)
  }

  const isEnd = createMemo(() => {
    const {playingId, totalDuration, playedTime} = defaultProps.playState

    return Boolean(playingId) && totalDuration <= playedTime
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

    if (_repeat === 'one' && innerProps.playState.playingId) {
      handlePlay(innerProps.playState.playingId)

      return
    }

    const nextItem = getNextItem(innerProps.playState.playingId, _repeat)

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

  const isSuspend = createMemo(() => {
    return Boolean(innerProps.playState.suspended)
  })

  const playingId = createMemo(() => {
    return innerProps.playState.playingId
  })

  const totalDuration = createMemo(() => {
    return innerProps.playState.totalDuration
  })

  const playedTime = createMemo(() => {
    return innerProps.playState.playedTime
  })

  createEffect(() => {
    const musics = innerProps.initMusics ?? []

    if (musics.length > 0) {
      setPlayList(musics)
    }
  })

  return (
    <Show when={innerProps.isShow}>
      <SPlayerController
        {...restProps}
        playedTime={playedTime()}
        repeat={repeat()}
        totalDuration={totalDuration()}
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
        onPlay={handlePlay}
        onSeek={handleSeek}
        onSetting={innerProps.onSetting}
        onChangeRepeat={handleChangeRepeat}
      />
    </Show>
  )
}
