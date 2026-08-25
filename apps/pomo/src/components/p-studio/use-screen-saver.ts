import {type Accessor, createMemo, createSignal} from 'solid-js'

import type {PTrack} from '../../features/focus-room-audio'
import {type ScreenSaverController, useScreenSaver} from '../../features/screen-saver'
import * as m from '@paraglide/message'
import type {PPomodoroPresentation} from '../PPomodoro'
import type {PScreenSaverTimer} from '../PScreenSaver'

interface StudioScreenSaverController extends ScreenSaverController {
  readonly currentTrack: Accessor<PTrack | null>
  readonly isMusicPlaying: Accessor<boolean>
  readonly onMusicPlayingChange: (isPlaying: boolean) => void
  readonly onPomodoroPresentationChange: (presentation: PPomodoroPresentation) => void
  readonly onTrackChange: (track: PTrack | null) => void
  readonly timer: Accessor<PScreenSaverTimer>
}

const getInitialPresentation = (): PPomodoroPresentation => ({
  phaseLabel: m.pomodoro_focus(),
  statusLabel: m.pomodoro_focus_ready(),
  timeLabel: '25:00',
})

/** Coordinates the player and timer state presented by the studio screen saver. */
export const useStudioScreenSaver = (): StudioScreenSaverController => {
  const screenSaver = useScreenSaver()
  const [currentTrack, setCurrentTrack] = createSignal<PTrack | null>(null)
  const [isMusicPlaying, setIsMusicPlaying] = createSignal(false)
  const [pomodoroPresentation, setPomodoroPresentation] =
    createSignal<PPomodoroPresentation>(getInitialPresentation())
  const timer = createMemo(() => {
    const presentation = pomodoroPresentation()

    return {status: presentation.statusLabel, time: presentation.timeLabel}
  })

  return {
    ...screenSaver,
    currentTrack,
    isMusicPlaying,
    onMusicPlayingChange: setIsMusicPlaying,
    onPomodoroPresentationChange: setPomodoroPresentation,
    onTrackChange: setCurrentTrack,
    timer,
  }
}
