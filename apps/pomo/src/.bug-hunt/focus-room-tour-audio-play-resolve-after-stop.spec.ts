/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import {createFocusRoomTourAudioPlayer, type FocusRoomTourAudioRuntime} from '../features/focus-room-tour-audio'

it('should pause again when play() resolves after stop() superseded the clip', async () => {
  let completePlay: () => void = () => undefined
  const pendingPlay = new Promise<void>((resolve) => {
    completePlay = resolve
  })
  const audio = {
    currentTime: 0,
    load: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(() => pendingPlay),
    removeAttribute: vi.fn(),
  }
  const runtime: FocusRoomTourAudioRuntime = {
    createAudio: vi.fn(() => audio as unknown as HTMLAudioElement),
  }
  const player = createFocusRoomTourAudioPlayer(runtime)

  player.play('/tour/audio/ko/pomodoro.mp3')
  player.stop()
  completePlay()
  await pendingPlay

  expect(audio.pause).toHaveBeenCalledTimes(2)
})
