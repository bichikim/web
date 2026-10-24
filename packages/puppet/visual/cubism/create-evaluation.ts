import {mixMotionFrames, type MotionMix} from '../../src/player/playback/mix-motion-frames'
import {evaluatePhysics, type PhysicsEvaluationResult} from '../../src/player/internal/physics'
import {evaluatePose, type PoseEvaluation} from '../../src/player/internal/pose'
import type {PuppetDocument, PuppetMotion} from '../../src/player/document'
import type {PlayerRenderer} from '../../src/player/rendering/create-player-renderer'
import type {PuppetParameterValueMap} from '../../src/deformation'
import type {ComparisonFrame, Reference} from './types'

interface EvaluationOptions {
  /** 비교할 문서. 호출 중 변경하지 않는다. */
  readonly document: PuppetDocument
  /** 빌려 쓰는 SDK 참조 모델. 호출자가 해제한다. */
  readonly reference: Reference
  /** 빌려 쓰는 Poffo 렌더러. 호출자가 해제한다. */
  readonly renderer: PlayerRenderer
}

export interface Evaluation {
  readonly duration: number
  readonly time: number
  draw(): ComparisonFrame
  reset(): void
  step(time: number): void
  select(id: string | null): void
  setParameter(id: string, value: number | undefined): void
  clearParameters(): void
}

/** 모션 이력·물리·포즈를 두 엔진에서 같은 순서로 계산한다. 시계와 GPU 수명은 호출자가 관리한다. */
export const createEvaluation = (options: EvaluationOptions): Evaluation => {
  const defaults = Object.fromEntries(
    options.document.parameters?.map((parameter) => [parameter.id, parameter.defaultValue]) ?? [],
  )
  let selected: PuppetMotion | undefined = options.document.motions[0]
  let time = 0
  let overrides: PuppetParameterValueMap = {}
  let previousValues: PuppetParameterValueMap | undefined
  let physics: PhysicsEvaluationResult
  let pose: PoseEvaluation
  let mix: MotionMix
  const step = (target: number) => {
    const deltaTime = target - time
    options.reference.step(target, deltaTime, overrides)
    mix = mixMotionFrames({
      baseParameterValues: previousValues,
      document: options.document,
      frames:
        selected === undefined
          ? []
          : [
              {
                blend: 'replace',
                elapsed: target,
                motion: selected,
                priority: 0,
                remaining: selected.duration - target,
                time: target,
                weight: 1,
              },
            ],
      parameterValues: overrides,
    })
    previousValues = mix.motionParameterValues
    physics = evaluatePhysics({
      chainState: physics.chainState,
      deltaTime,
      document: options.document,
      parameterValues: mix.parameterValues,
      physicsState: physics.physicsState,
    })
    pose = evaluatePose({
      deltaTime,
      document: options.document,
      parameterValues: physics.parameterValues,
      poseState: pose.poseState,
    })
    time = target
  }
  return {
    clearParameters() {
      overrides = {}
    },
    draw() {
      options.renderer.applyFrame(mix, physics.parameterValues, pose.opacityByPartId)
      options.reference.draw()
      options.renderer.redraw()
      return {
        duration: selected?.duration ?? 0,
        motionId: selected?.id ?? null,
        overrides,
        poffoValues: physics.parameterValues,
        sdkValues: options.reference.values(),
        time,
      }
    },
    get duration() {
      return selected?.duration ?? 0
    },
    reset() {
      options.reference.reset(selected?.id ?? null)
      time = 0
      previousValues = undefined
      physics = evaluatePhysics({
        deltaTime: 0,
        document: options.document,
        parameterValues: defaults,
        physicsState: new Map(),
        settle: true,
      })
      pose = evaluatePose({
        deltaTime: 0,
        document: options.document,
        parameterValues: defaults,
        poseState: new Map(),
        settle: true,
      })
      step(0)
    },
    select(id) {
      selected = options.document.motions.find((motion) => motion.id === id)
    },
    setParameter(id, value) {
      const parameter = options.document.parameters?.find((parameter) => parameter.id === id)
      if (parameter === undefined) {
        return
      }
      const {[id]: _removed, ...rest} = overrides
      overrides =
        value === undefined
          ? rest
          : {
              ...rest,
              [id]: Math.fround(Math.min(parameter.maximum, Math.max(parameter.minimum, value))),
            }
    },
    step,
    get time() {
      return time
    },
  }
}
