import {createEffect, createMemo, createSignal, onCleanup} from 'solid-js'

export interface UseAnimationFrameOptions {
  /** Target FPS limit. If not set, runs at display refresh rate */
  fps?: number
}

const SECONDS_TO_MILLISECONDS = 1000

/**
 * A Solid.js hook that manages a requestAnimationFrame loop.
 *
 * @param callback - Called on each frame with deltaTime (ms since last frame)
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * // Basic usage - runs at display refresh rate
 * const {start, stop} = useAnimationFrame((deltaTime) => {
 *   position += velocity * deltaTime
 * })
 *
 * // With FPS limit
 * const {start} = useAnimationFrame(
 *   (deltaTime) => update(deltaTime),
 *   {fps: 30}
 * )
 * ```
 */
export const useAnimationFrame = (
  callback: (deltaTime: number) => void,
  options?: UseAnimationFrameOptions,
) => {
  const targetInterval = options?.fps ? SECONDS_TO_MILLISECONDS / options.fps : 0

  const [start, setStart] = createSignal(false)
  let frameId: number | undefined
  let lastTime: number | undefined

  createEffect(() => {
    const isRunning = start()
    let cancelled = false

    if (!isRunning) {
      return
    }

    const animationFrame = (timestamp: number) => {
      frameId = undefined

      // Initialize lastTime on first frame
      if (lastTime === undefined) {
        lastTime = timestamp
      }

      const deltaTime = timestamp - lastTime

      // FPS limiting: skip if not enough time has passed
      if (targetInterval > 0 && deltaTime < targetInterval) {
        if (!cancelled) {
          frameId = requestAnimationFrame(animationFrame)
        }

        return
      }

      lastTime = timestamp
      callback(deltaTime)

      if (!cancelled) {
        frameId = requestAnimationFrame(animationFrame)
      }
    }

    frameId = requestAnimationFrame(animationFrame)

    onCleanup(() => {
      cancelled = true

      if (frameId !== undefined) {
        cancelAnimationFrame(frameId)
      }

      lastTime = undefined
    })
  })

  const isRunning = createMemo(() => start())

  return {
    isRunning,
    start: () => setStart(true),
    stop: () => setStart(false),
  }
}
