import type {PuppetParameterValueMap} from '../../deformation'
import type {MotionFrame, SerializedMotionFrame} from './types'
import type {PuppetMotion} from '../document'

export interface MotionHistoryState {
  readonly frames: ReadonlyArray<SerializedMotionFrame>
  readonly base: PuppetParameterValueMap
  readonly values: PuppetParameterValueMap
}

/** 같은 시점의 새로 고침은 같은 기준을 사용하고, 시간이 이동하면 직전 모션 값을 이어받는다. */
export const createMotionParameterHistory = () => {
  let frames: ReadonlyArray<MotionFrame> = []
  let base: PuppetParameterValueMap = {}
  let values: PuppetParameterValueMap = {}
  return {
    base(next: ReadonlyArray<MotionFrame>) {
      if (
        next.length !== frames.length ||
        next.some((frame, index) => {
          const previous = frames[index]
          return (
            frame.motion !== previous?.motion ||
            frame.time !== previous.time ||
            frame.elapsed !== previous.elapsed ||
            frame.remaining !== previous.remaining
          )
        })
      ) {
        base = values
        frames = next
      }
      return base
    },
    capture: (): MotionHistoryState => ({
      base,
      frames: frames.map(({motion, ...frame}) => ({...frame, motionId: motion.id})),
      values,
    }),
    record(next: PuppetParameterValueMap) {
      values = next
    },
    reset(parameterIds?: ReadonlyArray<string>) {
      frames = []
      const retained = (current: PuppetParameterValueMap) =>
        parameterIds === undefined
          ? {}
          : Object.fromEntries(Object.entries(current).filter(([id]) => !parameterIds.includes(id)))
      base = retained(base)
      values = retained(values)
    },
    restore(state: MotionHistoryState, motions: ReadonlyArray<PuppetMotion>) {
      base = state.base
      values = state.values
      frames = state.frames.map(({motionId, ...frame}) => {
        const motion = motions.find((candidate) => candidate.id === motionId)
        if (motion === undefined) {
          throw new Error('Motion history checkpoint is missing its motion')
        }
        return {...frame, motion}
      })
    },
  }
}
