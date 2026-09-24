import type {PuppetDocument, PuppetParameter} from '../document'
import {advancePendulum, createPendulumState, type PendulumState} from '../physics'
import type {PuppetParameterValueMap} from '../../deformation'

export interface EvaluatePhysicsOptions {
  readonly deltaTime: number
  readonly document: PuppetDocument
  readonly parameterValues: PuppetParameterValueMap
  readonly physicsState: ReadonlyMap<string, PendulumState>
  readonly settle?: boolean
}

export interface PhysicsEvaluationResult {
  readonly parameterValues: PuppetParameterValueMap
  readonly physicsState: ReadonlyMap<string, PendulumState>
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const getParameterValue = (
  parameter: PuppetParameter,
  parameterValues: PuppetParameterValueMap,
) => {
  const value = parameterValues[parameter.id]
  const resolvedValue =
    value === undefined || !Number.isFinite(value) ? parameter.defaultValue : value

  return clamp(resolvedValue, parameter.minimum, parameter.maximum)
}

const getParameterById = (document: PuppetDocument) =>
  new Map((document.parameters ?? []).map((parameter) => [parameter.id, parameter]))

export const createPhysicsState = (document: PuppetDocument): ReadonlyMap<string, PendulumState> =>
  new Map(
    (document.physics?.pendulums ?? []).map((pendulum) => [pendulum.id, createPendulumState()]),
  )

export const evaluatePhysics = (options: EvaluatePhysicsOptions): PhysicsEvaluationResult => {
  const parameterById = getParameterById(options.document)
  const baseParameterValues = {...options.parameterValues}
  let parameterValues: PuppetParameterValueMap = {...baseParameterValues}
  const physicsState = new Map<string, PendulumState>()

  for (const pendulum of options.document.physics?.pendulums ?? []) {
    const inputParameter = parameterById.get(pendulum.inputParameterId)
    const outputParameter = parameterById.get(pendulum.outputParameterId)

    if (inputParameter !== undefined && outputParameter !== undefined) {
      const state = options.physicsState.get(pendulum.id) ?? createPendulumState()
      const input = getParameterValue(inputParameter, parameterValues) - inputParameter.defaultValue
      const target = input * pendulum.inputScale
      const nextState =
        options.settle === true
          ? {
              accumulator: 0,
              position: Number.isFinite(target) ? target : state.position,
              velocity: 0,
            }
          : advancePendulum({
              deltaTime: options.deltaTime,
              input,
              pendulum,
              state,
            })
      const baseOutputValue = getParameterValue(outputParameter, baseParameterValues)
      const position =
        pendulum.outputMode === 'lag' ? nextState.position - target : nextState.position
      const displacement = position * pendulum.outputScale
      const outputCandidate = baseOutputValue + displacement
      const outputValue = Number.isFinite(outputCandidate)
        ? clamp(outputCandidate, outputParameter.minimum, outputParameter.maximum)
        : baseOutputValue

      parameterValues = {...parameterValues, [outputParameter.id]: outputValue}
      physicsState.set(pendulum.id, nextState)
    }
  }

  return {parameterValues, physicsState}
}
