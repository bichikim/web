import {createBrowserTurnEnvironment, type PageTurnEnvironment} from '../../turn-environment'

const SPREAD_WIDTH = 800
const PAGE_WIDTH = 400
const FRAME_INTERVAL = 16

export const createTurnHarness = () => {
  let time = 0
  let nextId = 0
  let compact = false
  let reduced = false
  const frames = new Map<number, FrameRequestCallback>()
  const environment: PageTurnEnvironment = {
    cancelFrame: (id) => {
      frames.delete(id)
    },
    getMetrics: () => ({
      compact,
      height: 500,
      left: 0,
      pageWidth: compact ? SPREAD_WIDTH : PAGE_WIDTH,
      top: 0,
    }),
    listenPointers: (handlers) => createBrowserTurnEnvironment({}).listenPointers(handlers),
    now: () => time,
    prefersReducedMotion: () => reduced,
    requestFrame: (callback) => {
      nextId += 1
      frames.set(nextId, callback)
      return nextId
    },
  }
  return {
    advance: (milliseconds: number) => {
      const end = time + milliseconds
      while (time < end) {
        time = Math.min(time + FRAME_INTERVAL, end)
        const pending = [...frames.values()]
        frames.clear()
        for (const callback of pending) {
          callback(time)
        }
      }
    },
    environment,
    reduceMotion: () => {
      reduced = true
    },
    reset: () => {
      time = 0
      compact = false
      reduced = false
      frames.clear()
    },
    setCompact: (value: boolean) => {
      compact = value
    },
  }
}
