import {createPlayerRenderer} from '../../src/player/rendering/create-player-renderer'
import {createReference} from './reference.mjs'
import {createEvaluation, type Evaluation} from './create-evaluation'
import type {Comparison, ComparisonOptions} from './types'

const FRAMES_PER_SECOND = 60
const MILLISECONDS_PER_SECOND = 1000
const FRAME_DURATION = 1 / FRAMES_PER_SECOND
const MAX_FRAME_DURATION = 0.25
const TIME_EPSILON = 1e-9

/** 두 엔진을 같은 시계로 재생한다. GPU·관찰자·애니메이션은 destroy에서 해제한다. */
export const createComparison = async (options: ComparisonOptions): Promise<Comparison> => {
  const reference = await createReference(options)
  const renderer = await createPlayerRenderer({
    canvas: options.poffoCanvas,
    document: options.document,
    resizeTo: options.host,
  }).catch((error: unknown) => {
    reference.destroy()
    throw error
  })
  let evaluation: Evaluation
  let playing = false
  let destroyed = false
  let animation: number | undefined
  let previousStamp: number | undefined
  let budget = 0
  const draw = () => options.onFrame({...evaluation.draw(), playing})
  const seek = (target: number) => {
    const bounded = Math.min(evaluation.duration, Math.max(0, target))
    evaluation.reset()
    const count = Math.ceil(bounded / FRAME_DURATION)
    for (let index = 0; index < count; index += 1) {
      evaluation.step(Math.min(bounded, evaluation.time + FRAME_DURATION))
    }
    budget = 0
    previousStamp = undefined
    draw()
  }
  const pause = () => {
    playing = false
    if (animation !== undefined) {
      cancelAnimationFrame(animation)
    }
    animation = undefined
    previousStamp = undefined
    draw()
  }
  const tick = (stamp: number) => {
    if (destroyed || !playing) {
      return
    }
    try {
      budget +=
        previousStamp === undefined
          ? 0
          : Math.min(MAX_FRAME_DURATION, (stamp - previousStamp) / MILLISECONDS_PER_SECOND)
      previousStamp = stamp
      while (budget >= FRAME_DURATION) {
        if (evaluation.time >= evaluation.duration - TIME_EPSILON) {
          evaluation.reset()
        } else {
          evaluation.step(Math.min(evaluation.duration, evaluation.time + FRAME_DURATION))
        }
        budget -= FRAME_DURATION
      }
      draw()
      animation = requestAnimationFrame(tick)
    } catch (error) {
      playing = false
      options.onError(error)
    }
  }
  const resize = () => {
    renderer.resize()
    reference.resize(options.poffoCanvas.width, options.poffoCanvas.height)
    draw()
  }
  let observer: ResizeObserver | undefined
  const destroy = () => {
    if (destroyed) {
      return
    }
    destroyed = true
    if (animation !== undefined) {
      cancelAnimationFrame(animation)
    }
    observer?.disconnect()
    options.signal.removeEventListener('abort', destroy)
    renderer.destroy()
    reference.destroy()
  }
  try {
    renderer.setRunning(false)
    evaluation = createEvaluation({document: options.document, reference, renderer})
    observer = new ResizeObserver(resize)
    options.signal.throwIfAborted()
    options.signal.addEventListener('abort', destroy, {once: true})
    evaluation.reset()
    resize()
    observer.observe(options.host)
  } catch (cause) {
    destroy()
    throw cause
  }
  return {
    clearParameters() {
      evaluation.clearParameters()
      seek(evaluation.time)
    },
    destroy,
    pause,
    play() {
      if (destroyed || playing || evaluation.duration === 0) {
        return
      }
      playing = true
      previousStamp = undefined
      draw()
      animation = requestAnimationFrame(tick)
    },
    seek,
    select(id) {
      evaluation.select(id)
      if (id === null) {
        pause()
      }
      seek(0)
    },
    setParameter(id, value) {
      evaluation.setParameter(id, value)
      seek(evaluation.time)
    },
  }
}
