import {expect, it, vi} from 'vitest'
import {createDesktopMusicActionInbox} from '../desktop-music-actions'

it('should preserve independent subscriptions and announce each native disconnect once', async () => {
  const inbox = createDesktopMusicActionInbox()
  const sender = new BroadcastChannel('pomo:desktop-music-action')
  const connections: unknown[] = []
  sender.onmessage = (event: MessageEvent<unknown>) => connections.push(event.data)
  const received = vi.fn()

  try {
    const first = inbox.subscribe(received)
    const second = inbox.subscribe(received)
    await expect.poll(() => connections).toEqual([{type: 'player-ready'}])

    first()
    first()
    sender.postMessage({actionId: 'music-start'})
    await expect.poll(() => received.mock.calls).toEqual([['music-start']])

    second()
    second()
    const resumed = vi.fn()
    const third = inbox.subscribe(resumed)
    await expect
      .poll(() => connections)
      .toEqual([{type: 'player-ready'}, {type: 'player-unavailable'}, {type: 'player-ready'}])
    sender.postMessage({actionId: 'music-stop'})
    await expect.poll(() => resumed.mock.calls).toEqual([['music-stop']])
    expect(received).toHaveBeenCalledOnce()

    inbox.close()
    third()
    third()
    await expect
      .poll(() => connections)
      .toEqual([
        {type: 'player-ready'},
        {type: 'player-unavailable'},
        {type: 'player-ready'},
        {type: 'player-unavailable'},
      ])
  } finally {
    inbox.close()
    sender.close()
  }
})
