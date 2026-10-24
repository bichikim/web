/** @vitest-environment node */

import {afterEach, expect, it} from 'vitest'

import {createDesktopMusicActionChannel} from '../desktop-music-actions'

const channels: BroadcastChannel[] = []

afterEach(() => {
  for (const channel of channels) {
    channel.close()
  }

  channels.length = 0
})

it('should deliver a desktop music action across native broadcast channels', async () => {
  const sender = createDesktopMusicActionChannel()
  const receiver = createDesktopMusicActionChannel()

  if (sender === null || receiver === null) {
    throw new Error('The Node test environment must provide BroadcastChannel.')
  }

  channels.push(sender, receiver)

  const message = new Promise<unknown>((resolve) => {
    receiver.addEventListener('message', (event) => resolve(event.data), {once: true})
  })

  sender.postMessage({actionId: 'music-start'})

  await expect(message).resolves.toEqual({actionId: 'music-start'})
})
