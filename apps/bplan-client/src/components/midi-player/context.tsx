import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  ParentProps,
  untrack,
  useContext,
} from 'solid-js'
import {MusicInfo} from 'src/components/midi-player/SFileItem'
import {RepeatType} from 'src/components/midi-player/types'
import {SplendidGrandPianoController, SplendidGrandPianoState} from 'src/use/instruments'

export interface MidiPlayerContextProps {
  handleAddPlayItem: (musics: MusicInfo[]) => void
  handleChangeRepeat: (value: RepeatType) => void
  handleDelete: (id: string) => void
  /**
   * Play the music
   * if id is not provided, play selected music
   * @param id - The id of the music to play
   */
  handlePlay: (id?: string) => void
  handleResume: () => void
  handleSeek: (time: number) => void
  handleSelect: (id: string) => void
  handleStop: () => void
  handleSuspend: () => void
  handleTryRepeat: () => void
  isPlaying: Accessor<boolean>
  isSuspend: Accessor<boolean>
  playList: Accessor<MusicInfo[]>
  playedTime: Accessor<number>
  playingId: Accessor<string>
  repeat: Accessor<RepeatType>
  selectedId: Accessor<string>
  totalDuration: Accessor<number>
}

export interface MidiPlayerProviderProps extends ParentProps {
  initMusics?: MusicInfo[]
  onMusicsChange?: (musics: MusicInfo[]) => void
  onSetting?: () => void
  pianoController?: SplendidGrandPianoController
  playState?: SplendidGrandPianoState
}

export const MidiPlayerContext = createContext<MidiPlayerContextProps>({
  handleAddPlayItem: () => {
    //
  },
  handleChangeRepeat: () => {
    //
  },
  handleDelete: () => {
    //
  },
  handlePlay: () => {
    //
  },
  handleResume: () => {
    //
  },
  handleSeek: () => {
    //
  },
  handleSelect: () => {
    //
  },
  handleStop: () => {
    //
  },
  handleSuspend: () => {
    //
  },
  handleTryRepeat: () => {
    //
  },
  isPlaying: () => false,
  isSuspend: () => false,
  playList: () => [],
  playedTime: () => 0,
  playingId: () => '',
  repeat: () => 'no' as const,
  selectedId: () => '',
  totalDuration: () => 0,
})

export const useMidiPlayer = () => {
  return useContext(MidiPlayerContext)
}

export const MidiPlayerProvider = (props: MidiPlayerProviderProps) => {
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

  const [playList, setPlayList] = createSignal<MusicInfo[]>(
    untrack(() => defaultProps.initMusics ?? []),
  )
  const [selectedId, setSelectedId] = createSignal<string>('')
  const [repeat, setRepeat] = createSignal<RepeatType>('no')

  const handleMusicsChange = () => {
    defaultProps.onMusicsChange?.(playList())
  }

  const handleStop = async () => {
    defaultProps.pianoController?.stop()
  }

  const handleResume = () => {
    defaultProps.pianoController?.resume()
  }

  const handleSuspend = () => {
    defaultProps.pianoController?.suspend()
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
        defaultProps.pianoController?.play(firstItem)
      }

      return
    }

    defaultProps.pianoController?.play(info)
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

    if (_repeat === 'one' && defaultProps.playState.playingId) {
      handlePlay(defaultProps.playState.playingId)

      return
    }

    const nextItem = getNextItem(defaultProps.playState.playingId, _repeat)

    if (nextItem) {
      defaultProps.pianoController?.play(nextItem)
    }
  }

  const handleSeek = (time: number) => {
    defaultProps.pianoController?.seek(time)
  }

  createEffect(() => {
    if (isEnd()) {
      handleTryRepeat()
    }

    return isEnd()
  })

  const isSuspend = createMemo(() => {
    return Boolean(defaultProps.playState.suspended)
  })

  const playingId = createMemo(() => {
    return defaultProps.playState.playingId
  })

  const totalDuration = createMemo(() => {
    return defaultProps.playState.totalDuration
  })

  const playedTime = createMemo(() => {
    return defaultProps.playState.playedTime
  })

  const isPlaying = createMemo(() => {
    return Boolean(
      defaultProps.playState.playingId !== '' &&
        defaultProps.playState.leftTime < defaultProps.playState.totalDuration &&
        !defaultProps.playState.suspended,
    )
  })

  createEffect(() => {
    const musics = defaultProps.initMusics ?? []

    if (musics.length > 0) {
      setPlayList(musics)
    }
  })

  const contextValue = {
    handleAddPlayItem,
    handleChangeRepeat,
    handleDelete,
    handlePlay: (id?: string) => {
      const _id = id ?? selectedId()

      if (!_id) {
        return
      }

      handlePlay(_id)
    },
    handleResume,
    handleSeek,
    handleSelect,
    handleStop,
    handleSuspend,
    handleTryRepeat,
    isPlaying,
    isSuspend,
    playList,
    playedTime,
    playingId,
    repeat,
    selectedId,
    totalDuration,
  }

  return (
    <MidiPlayerContext.Provider value={contextValue}>
      {props.children}
    </MidiPlayerContext.Provider>
  )
}
