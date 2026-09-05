import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {usePictureDiaryPageTurn} from '../use-page-turn'
import type {PageTurnEnvironment} from '../turn-environment'

const createHarness = () => {
  let time = 0
  let nextFrame = 0
  let compact = false
  let reduced = false
  const frames = new Map<number, FrameRequestCallback>()
  const onComplete = vi.fn()
  const environment: PageTurnEnvironment = {
    cancelFrame: (id) => {
      frames.delete(id)
    },
    getMetrics: () => ({compact, height: 500, left: 0, pageWidth: compact ? 800 : 400, top: 0}),
    listenPointers: () => () => undefined,
    now: () => time,
    prefersReducedMotion: () => reduced,
    requestFrame: (callback) => {
      nextFrame += 1
      frames.set(nextFrame, callback)
      return nextFrame
    },
  }
  const context = createRoot((dispose) => ({
    dispose,
    turn: usePictureDiaryPageTurn({
      disabled: () => false,
      environment,
      onComplete,
      resolveIntent: (direction) => ({direction, kind: 'entry'}),
    }),
  }))
  return {
    ...context,
    advance: (milliseconds: number) => {
      time += milliseconds
      const callbacks = [...frames.values()]
      frames.clear()
      for (const callback of callbacks) {
        callback(time)
      }
    },
    frames,
    onComplete,
    reduceMotion: () => {
      reduced = true
    },
    resize: () => {
      compact = !compact
    },
  }
}

it('should complete a turn with an injected clock and frame scheduler without browser globals', () => {
  const harness = createHarness()
  harness.turn.startTurn('newer')
  harness.advance(0)
  harness.advance(300)
  expect(harness.turn.view()?.fold?.progress).toBeGreaterThan(0)
  expect(harness.onComplete).not.toHaveBeenCalled()
  harness.advance(300)
  expect(harness.onComplete).toHaveBeenCalledWith({direction: 'newer', kind: 'entry'})
  expect(harness.turn.view()).toBeNull()
  harness.dispose()
})

it('should cancel a pending turn when injected geometry changes', () => {
  const harness = createHarness()
  harness.turn.startTurn('older')
  harness.resize()
  harness.advance(600)
  expect(harness.turn.view()).toBeNull()
  expect(harness.onComplete).not.toHaveBeenCalled()
  harness.dispose()
})

it('should cancel scheduled frames when its reactive owner is disposed', () => {
  const harness = createHarness()
  harness.turn.startTurn('newer')
  harness.dispose()
  expect(harness.frames.size).toBe(0)
  harness.advance(1000)
  expect(harness.onComplete).not.toHaveBeenCalled()
})

it('should honor the injected reduced-motion preference', () => {
  const harness = createHarness()
  harness.reduceMotion()
  harness.turn.startTurn('newer')
  expect(harness.onComplete).toHaveBeenCalledOnce()
  expect(harness.frames.size).toBe(0)
  harness.dispose()
})
