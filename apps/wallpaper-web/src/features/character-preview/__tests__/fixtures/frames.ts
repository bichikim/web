const pending = new Map<number, FrameRequestCallback>()
let sequence = 0
let now = 0

/** Drives the gaze frame port independently of software WebGL throughput. */
export const frames = {
  advance() {
    const MAXIMUM_FRAMES = 32
    const FRAME_MILLIS = 100
    for (let index = 0; index < MAXIMUM_FRAMES && pending.size > 0; index += 1) {
      const callbacks = [...pending.values()]
      pending.clear()
      now += FRAME_MILLIS
      const timestamp = now
      callbacks.forEach((callback) => callback(timestamp))
    }
    if (pending.size > 0) {
      throw new Error(`Character gaze did not settle within ${MAXIMUM_FRAMES} frames`)
    }
  },
  cancel(handle: number) {
    pending.delete(handle)
  },
  clear() {
    pending.clear()
    now = 0
  },
  request(callback: FrameRequestCallback) {
    sequence += 1
    pending.set(sequence, callback)
    return sequence
  },
}
