/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createDesktopMusicActionChannel,
  isDesktopMusicActionMessage,
} from '../desktop-music-actions'

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = []

  readonly close = vi.fn()

  constructor(readonly name: string) {
    TestBroadcastChannel.instances.push(this)
  }
}

beforeEach(() => {
  TestBroadcastChannel.instances = []
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it.each([{actionId: 'music-start'}, {actionId: 'music-stop'}] as const)(
  'should accept the desktop music action $actionId',
  (message) => {
    expect(isDesktopMusicActionMessage(message)).toBe(true)
  },
)

it.each([null, {}, {actionId: 'sound-effects-start'}, {actionId: 1}])(
  'should reject an unsupported desktop music action message %#',
  (message) => {
    expect(isDesktopMusicActionMessage(message)).toBe(false)
  },
)

it('should create a browser channel for desktop music actions', () => {
  const channel = createDesktopMusicActionChannel()

  expect(channel).toBe(TestBroadcastChannel.instances[0])
  expect(TestBroadcastChannel.instances[0]?.name).toBe('pomo:desktop-music-action')
})
