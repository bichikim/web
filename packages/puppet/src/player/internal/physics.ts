import type {PuppetDocument, PuppetParameter} from '../document'
import {advancePendulum, createPendulumState, type PendulumState} from '../physics'
import type {PuppetParameterValueMap} from '../../deformation'
import {boundParameterValue} from '../parameter-value'
import {advanceChains, type ChainsState, matchesChains, settleChains} from '../physics-chain'
import {applyPhysicsOptions, type PuppetPhysicsOptions} from '../physics-options'

export interface EvaluatePhysicsOptions {
  /** Chain state from the previous evaluation; without it (or after chain edits) chains settle. */
  readonly chainState?: ChainsState
  readonly deltaTime: number
  readonly document: PuppetDocument
  readonly parameterValues: PuppetParameterValueMap
  /** The app's gravity and wind for chains, in place of the document's. */
  readonly physicsOptions?: PuppetPhysicsOptions
  readonly physicsState: ReadonlyMap<string, PendulumState>
  readonly settle?: boolean
}

export interface PhysicsEvaluationResult {
  readonly chainState: ChainsState
  readonly parameterValues: PuppetParameterValueMap
  readonly physicsState: ReadonlyMap<string, PendulumState>
}

const getParameterValue = (
  parameter: PuppetParameter,
  parameterValues: PuppetParameterValueMap,
) => {
  const value = parameterValues[parameter.id]
  const resolvedValue =
    value === undefined || !Number.isFinite(value) ? parameter.defaultValue : value

  return boundParameterValue(parameter, resolvedValue)
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
        ? boundParameterValue(outputParameter, outputCandidate)
        : baseOutputValue

      parameterValues = {...parameterValues, [outputParameter.id]: outputValue}
      physicsState.set(pendulum.id, nextState)
    }
  }

  const chained = evaluateChains({...options, parameterById, parameterValues})
  return {chainState: chained.chainState, parameterValues: chained.parameterValues, physicsState}
}

/** Settles chains on `settle`, without state, or after chain edits; otherwise advances them. */
const evaluateChains = (
  options: EvaluatePhysicsOptions & {readonly parameterById: ReadonlyMap<string, PuppetParameter>},
) => {
  const physics = applyPhysicsOptions(options.document.physics, options.physicsOptions)
  const common = {
    parameters: options.parameterById,
    physics,
    values: options.parameterValues,
  }
  const {state, values} =
    options.settle === true ||
    options.chainState === undefined ||
    !matchesChains(options.chainState, physics)
      ? settleChains(common)
      : advanceChains({...common, deltaTime: options.deltaTime, state: options.chainState})
  return {chainState: state, parameterValues: values}
}
