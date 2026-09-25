/** @vitest-environment jsdom */

import {PreferenceProvider} from 'src/hooks/use-preference'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PomodoroTimerConfig} from '../features/pomodoro-timer/model'
import {usePomodoroTimer} from '../features/pomodoro-timer/use-pomodoro-timer'

const autoStartMocks = vi.hoisted(() => ({
  read: vi.fn<() => Promise<boolean>>(),
  write: vi.fn<(isEnabled: boolean) => Promise<void>>(),
}))

vi.mock('../features/pomodoro-timer/auto-start-storage', () => ({
  readAutoStartPreference: autoStartMocks.read,
  writeAutoStartPreference: autoStartMocks.write,
}))

const CONFIG = {
  focusSeconds: 10,
  focusSessionsPerCycle: 2,
  longBreakSeconds: 6,
  shortBreakSeconds: 4,
} satisfies PomodoroTimerConfig

class QueuedBroadcastChannel {
  static readonly instances: QueuedBroadcastChannel[] = []
  static holdIncoming = false
  static readonly pending: Array<{from: QueuedBroadcastChannel; data: unknown}> = []

  readonly name: string
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null

  constructor(name: string) {
    this.name = name
    QueuedBroadcastChannel.instances.push(this)
  }

  postMessage(data: unknown) {
    for (const peer of QueuedBroadcastChannel.instances) {
      if (peer === this || peer.name !== this.name) {
        continue
      }

      if (QueuedBroadcastChannel.holdIncoming) {
        QueuedBroadcastChannel.pending.push({data, from: this})
        continue
      }

      peer.onmessage?.({data} as MessageEvent<unknown>)
    }
  }

  close() {
    const index = QueuedBroadcastChannel.instances.indexOf(this)
    if (index >= 0) {
      QueuedBroadcastChannel.instances.splice(index, 1)
    }
  }

  static flushPending() {
    const deliveries = [...QueuedBroadcastChannel.pending]
    QueuedBroadcastChannel.pending.length = 0
    for (const {data, from} of deliveries) {
      for (const peer of QueuedBroadcastChannel.instances) {
        if (peer !== from && peer.name === from.name) {
          peer.onmessage?.({data} as MessageEvent<unknown>)
        }
      }
    }
  }
}

const finishInitialization = (view: {
  result: {waitForInitialization: () => Promise<void>}
}) => view.result.waitForInitialization()

beforeEach(() => {
  localStorage.clear()
  QueuedBroadcastChannel.instances.length = 0
  QueuedBroadcastChannel.pending.length = 0
  QueuedBroadcastChannel.holdIncoming = false
  autoStartMocks.read.mockReset().mockResolvedValue(false)
  autoStartMocks.write.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('BroadcastChannel', QueuedBroadcastChannel)
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should not apply a stale idle snapshot published before a delayed running update', async () => {
  const leader = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  const follower = renderHook(() => usePomodoroTimer(), {wrapper: PreferenceProvider})
  await Promise.all([finishInitialization(leader), finishInitialization(follower)])

  QueuedBroadcastChannel.holdIncoming = true
  leader.result.onConfigChange(CONFIG)
  leader.result.onStart()
  follower.result.onAutoStartChange(true)
  QueuedBroadcastChannel.holdIncoming = false
  QueuedBroadcastChannel.flushPending()

  await vi.waitFor(() => {
    expect(leader.result.state()).toMatchObject({status: 'running'})
  })

  leader.cleanup()
  follower.cleanup()
})
