import type {PuppetDocument} from '../document'
import type {PuppetParameterValueMap} from '../../deformation'
import type {PendulumState} from '../physics'
import {boundParameterValue} from '../parameter-value'
import {type ChainsState, releaseChains} from '../physics-chain'
import {applyPhysicsOptions, type PuppetPhysicsOptions} from '../physics-options'

/** Transfers displayed output values into the model's existing simulations. */
export const releasePhysics = (options: {
  readonly document: PuppetDocument
  readonly chainState: ChainsState
  readonly physicsState: ReadonlyMap<string, PendulumState>
  readonly physicsOptions?: PuppetPhysicsOptions
  readonly baseValues: PuppetParameterValueMap
  readonly values: PuppetParameterValueMap
}) => {
  const parameters = new Map(
    (options.document.parameters ?? []).map((parameter) => [parameter.id, parameter]),
  )
  const physicsState = new Map(options.physicsState)
  const physics = applyPhysicsOptions(options.document.physics, options.physicsOptions)
  const released = releaseChains({...options, parameters, physics, state: options.chainState})
  const parameterIds = new Set(released.parameterIds)
  for (const pendulum of physics?.pendulums ?? []) {
    const value = options.values[pendulum.outputParameterId]
    const output = parameters.get(pendulum.outputParameterId)
    const input = parameters.get(pendulum.inputParameterId)
    if (
      value !== undefined &&
      Number.isFinite(value) &&
      output !== undefined &&
      input !== undefined &&
      pendulum.outputScale !== 0
    ) {
      const base = boundParameterValue(output, options.baseValues[output.id] ?? output.defaultValue)
      const target =
        (boundParameterValue(input, options.baseValues[input.id] ?? input.defaultValue) -
          input.defaultValue) *
        pendulum.inputScale
      physicsState.set(pendulum.id, {
        accumulator: 0,
        position:
          (boundParameterValue(output, value) - base) / pendulum.outputScale +
          (pendulum.outputMode === 'lag' ? target : 0),
        velocity: 0,
      })
      parameterIds.add(output.id)
    }
  }
  return {chainState: released.state, parameterIds: [...parameterIds], physicsState}
}
