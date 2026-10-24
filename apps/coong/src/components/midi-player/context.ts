import {createContext} from 'solid-js'
import type {MidiPlayerContextProps} from './types'

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
  playedTime: () => 0,
  playingId: () => '',
  playList: () => [],
  repeat: () => 'no' as const,
  selectedId: () => '',
  totalDuration: () => 0,
})
