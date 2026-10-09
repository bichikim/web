export interface FocusRoomTourAudioRuntime {
  readonly createAudio: (source: string) => HTMLAudioElement
}

export interface FocusRoomTourAudioPlayer {
  readonly dispose: () => void
  readonly play: (source: string) => void
  readonly stop: () => void
}

const defaultRuntime: FocusRoomTourAudioRuntime = {
  createAudio: (source) => {
    const audio = new Audio(source)
    audio.preload = 'auto'
    return audio
  },
}

const stopAudio = (audio: HTMLAudioElement) => {
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
}

/** Creates a single-player controller for pre-recorded focus-room tour narration. */
export const createFocusRoomTourAudioPlayer = (
  runtime: FocusRoomTourAudioRuntime = defaultRuntime,
): FocusRoomTourAudioPlayer => {
  let currentAudio: HTMLAudioElement | null = null

  const stop = () => {
    const audio = currentAudio
    currentAudio = null

    if (audio === null) {
      return
    }

    stopAudio(audio)
  }

  const play = (source: string) => {
    stop()
    const audio = runtime.createAudio(source)
    currentAudio = audio
    audio.currentTime = 0
    audio.play().then(
      () => {
        if (currentAudio !== audio) {
          stopAudio(audio)
        }
      },
      () => {
        if (currentAudio === audio) {
          currentAudio = null
          stopAudio(audio)
        }
      },
    )
  }

  return {dispose: stop, play, stop}
}
