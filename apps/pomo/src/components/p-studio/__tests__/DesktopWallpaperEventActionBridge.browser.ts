import {cleanup, render} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {usePEvents} from '../../../features/focus-room-dialogue/event-context'
import {createEventActionRunner} from '../../../features/focus-room-dialogue/use-p-event-controller/event-action-runner'
import {createDesktopMusicActionInbox} from '../../../features/desktop-mode/desktop-music-actions'
import {SoundEffectsContext} from '../../../features/sound-effects/context'
import {DesktopWallpaperEventActionBridge} from '../DesktopWallpaperEventActionBridge'

vi.mock('../../../features/focus-room-dialogue/event-context', () => ({usePEvents: vi.fn()}))
afterEach(cleanup)

it('should keep sound local while native BroadcastChannels deliver queued music once in order', async () => {
  const runner = createEventActionRunner(() => ({
    'focus-end': ['sound-effects-stop'],
    'focus-start': ['sound-effects-start', 'music-start', 'music-stop'],
  }))
  vi.mocked(usePEvents).mockReturnValue({
    registerEventActionExecutor: runner.register,
    registerEventActionHandler: runner.registerHandler,
  } as ReturnType<typeof usePEvents>)
  const [status, setStatus] = createSignal<'loading' | 'ready'>('loading')
  const [stopped, setStopped] = createSignal(false)
  const activate = vi.fn()
  const stop = vi.fn(() => setStopped(true))
  const view = render(() =>
    createComponent(SoundEffectsContext.Provider, {
      get children() {
        return createComponent(DesktopWallpaperEventActionBridge, {})
      },
      value: {
        activate,
        effects: () => [],
        getPlayback: () => undefined,
        isStopped: stopped,
        status,
        stop,
      },
    }),
  )
  const inbox = createDesktopMusicActionInbox()
  const received = vi.fn()
  try {
    runner.run(['focus-start', 'focus-end', 'focus-start'])
    expect(activate).not.toHaveBeenCalled()
    const unsubscribe = inbox.subscribe(received)
    setStatus('ready')
    expect(activate).toHaveBeenCalledOnce()
    expect(stop).toHaveBeenCalledOnce()
    await expect
      .poll(() => received.mock.calls)
      .toEqual([['music-start'], ['music-stop'], ['music-start'], ['music-stop']])
    unsubscribe()
    const resumed = vi.fn()
    const unregister = inbox.subscribe(resumed)
    await expect.poll(() => resumed.mock.calls).toEqual([])
    view.unmount()
    runner.run(['focus-start'])
    expect(activate).toHaveBeenCalledOnce()
    unregister()
  } finally {
    view.unmount()
    inbox.close()
    runner.dispose()
  }
})
