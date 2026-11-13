import {createTestBroadcastChannel} from 'src/__tests__/create-test-broadcast-channel'
/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createDesktopMusicActionChannel,
  createDesktopMusicActionInbox,
  isDesktopMusicActionConnectionMessage,
  isDesktopMusicActionMessage,
} from '../desktop-music-actions'

const TestBroadcastChannel = createTestBroadcastChannel()

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

it.each([
  {type: 'player-ready'},
  {type: 'request-player-ready'},
  {type: 'player-unavailable'},
] as const)('should accept desktop music connection message $type', (message) => {
  expect(isDesktopMusicActionConnectionMessage(message)).toBe(true)
})

it.each([null, {}, {type: 'unrecognized'}, {type: 1}])(
  'should reject an unsupported desktop music connection message %#',
  (message) => {
    expect(isDesktopMusicActionConnectionMessage(message)).toBe(false)
  },
)

it('should create a browser channel for desktop music actions', () => {
  const channel = createDesktopMusicActionChannel()

  expect(channel).toBe(TestBroadcastChannel.instances[0])
  expect(TestBroadcastChannel.instances[0]?.name).toBe('pomo:desktop-music-action')
})

it('should retain separate subscriptions for the same handler when one unregisters twice', () => {
  const inbox = createDesktopMusicActionInbox()
  const handler = vi.fn()
  const first = inbox.subscribe(handler)
  const second = inbox.subscribe(handler)
  const channel = TestBroadcastChannel.instances[0]!

  try {
    first()
    first()
    channel.dispatch({actionId: 'music-start'})
    expect(handler.mock.calls).toEqual([['music-start']])
    expect(channel.postMessage.mock.calls).toEqual([[{type: 'player-ready'}]])

    second()
    second()
    expect(channel.postMessage.mock.calls).toEqual([
      [{type: 'player-ready'}],
      [{type: 'player-unavailable'}],
    ])
  } finally {
    inbox.close()
  }
})

it('should queue actions after the last subscription ends and flush before reporting ready', () => {
  const inbox = createDesktopMusicActionInbox()
  const first = inbox.subscribe(vi.fn())
  const channel = TestBroadcastChannel.instances[0]!

  try {
    first()
    first()
    channel.dispatch({actionId: 'music-stop'})
    const received = vi.fn(() => {
      expect(channel.postMessage).toHaveBeenCalledTimes(2)
    })
    const second = inbox.subscribe(received)

    expect(received.mock.calls).toEqual([['music-stop']])
    expect(channel.postMessage.mock.calls).toEqual([
      [{type: 'player-ready'}],
      [{type: 'player-unavailable'}],
      [{type: 'player-ready'}],
    ])
    second()
  } finally {
    inbox.close()
  }
})

it('should consume a subscription before a synchronous unavailable callback unregisters it again', () => {
  const inbox = createDesktopMusicActionInbox()
  const unsubscribe = inbox.subscribe(vi.fn())
  const channel = TestBroadcastChannel.instances[0]!
  channel.postMessage.mockImplementation(() => unsubscribe())

  try {
    unsubscribe()
    unsubscribe()
    expect(channel.postMessage.mock.calls).toEqual([
      [{type: 'player-ready'}],
      [{type: 'player-unavailable'}],
    ])
  } finally {
    inbox.close()
  }
})

it('should propagate an unavailable notification failure without retrying the consumed subscription', () => {
  const inbox = createDesktopMusicActionInbox()
  const unsubscribe = inbox.subscribe(vi.fn())
  const channel = TestBroadcastChannel.instances[0]!
  const failure = new Error('channel unavailable')
  channel.postMessage.mockImplementationOnce(() => {
    throw failure
  })

  try {
    expect(unsubscribe).toThrow(failure)
    expect(unsubscribe).not.toThrow()
    expect(channel.postMessage.mock.calls).toEqual([
      [{type: 'player-ready'}],
      [{type: 'player-unavailable'}],
    ])
  } finally {
    inbox.close()
  }
})

it('should preserve the current dispatch snapshot when a handler unregisters another subscription', () => {
  const inbox = createDesktopMusicActionInbox()
  let second: () => void = () => undefined
  const firstHandler = vi.fn(() => second())
  const secondHandler = vi.fn()
  const first = inbox.subscribe(firstHandler)
  second = inbox.subscribe(secondHandler)
  const channel = TestBroadcastChannel.instances[0]!

  try {
    channel.dispatch({actionId: 'music-start'})
    channel.dispatch({actionId: 'music-stop'})
    expect(firstHandler.mock.calls).toEqual([['music-start'], ['music-stop']])
    expect(secondHandler.mock.calls).toEqual([['music-start']])
    first()
    expect(channel.postMessage.mock.calls).toEqual([
      [{type: 'player-ready'}],
      [{type: 'player-unavailable'}],
    ])
  } finally {
    inbox.close()
  }
})

it('should make unsubscribe and subscribe inert after the inbox closes', () => {
  const inbox = createDesktopMusicActionInbox()
  const handler = vi.fn()
  const unsubscribe = inbox.subscribe(handler)
  const channel = TestBroadcastChannel.instances[0]!

  inbox.close()
  unsubscribe()
  unsubscribe()
  inbox.close()
  inbox.subscribe(handler)()
  channel.dispatch({actionId: 'music-start'})

  expect(handler).not.toHaveBeenCalled()
  expect(channel.postMessage.mock.calls).toEqual([
    [{type: 'player-ready'}],
    [{type: 'player-unavailable'}],
  ])
  expect(channel.close).toHaveBeenCalledOnce()
})
