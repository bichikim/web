import {
  MAXIMUM_PUPPET_FRAMES_PER_SECOND,
  PUPPET_PHYSICS_AXES,
  type PuppetParameter,
} from '../document'
import {isFiniteNumber, isRecord} from './parse-primitives'

const VECTOR_LENGTH = 2

const isRatio = (value: unknown) => isFiniteNumber(value) && value >= 0 && value <= 1

const isAxis = (value: unknown) => PUPPET_PHYSICS_AXES.some((axis) => axis === value)

const isVector = (value: unknown) =>
  value === undefined ||
  (Array.isArray(value) && value.length === VECTOR_LENGTH && value.every(isFiniteNumber))

const isRange = (value: unknown) =>
  isRecord(value) &&
  isFiniteNumber(value.minimum) &&
  isFiniteNumber(value.center) &&
  isFiniteNumber(value.maximum) &&
  value.minimum <= value.maximum

const isPendulum = (value: unknown) =>
  isRecord(value) &&
  isFiniteNumber(value.acceleration) &&
  isFiniteNumber(value.length) &&
  value.length > 0 &&
  isRatio(value.mobility) &&
  isFiniteNumber(value.reaction) &&
  value.reaction > 0

const hasParameter = (parameterIds: ReadonlySet<string>, value: Record<string, unknown>) =>
  typeof value.parameterId === 'string' && parameterIds.has(value.parameterId)

const isChain = (value: unknown, parameterIds: ReadonlySet<string>) => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    !Array.isArray(value.inputs) ||
    !Array.isArray(value.pendulums) ||
    !Array.isArray(value.outputs) ||
    !isRecord(value.normalization)
  ) {
    return false
  }
  const {inputs, outputs, pendulums} = value
  const inputIds = new Set(inputs.map((input) => (isRecord(input) ? input.parameterId : undefined)))
  return (
    isRange(value.normalization.angle) &&
    isRange(value.normalization.position) &&
    pendulums.length > 0 &&
    pendulums.every(isPendulum) &&
    inputs.every(
      (input) =>
        isRecord(input) &&
        hasParameter(parameterIds, input) &&
        isAxis(input.axis) &&
        isRatio(input.weight) &&
        (input.reflect === undefined || typeof input.reflect === 'boolean'),
    ) &&
    outputs.every(
      (output) =>
        isRecord(output) &&
        hasParameter(parameterIds, output) &&
        !inputIds.has(output.parameterId) &&
        isAxis(output.axis) &&
        Number.isInteger(output.pendulumIndex) &&
        (output.pendulumIndex as number) >= 0 &&
        (output.pendulumIndex as number) < pendulums.length &&
        isFiniteNumber(output.scale) &&
        isRatio(output.weight) &&
        (output.reflect === undefined || typeof output.reflect === 'boolean'),
    )
  )
}

/**
 * Chains with unique IDs whose inputs and outputs name parameters (an output never feeds its
 * own chain), plus optional non-negative `fps`, non-zero `[x, y]` gravity and `[x, y]` wind.
 */
export const hasValidPhysicsChains = (
  physics: Record<string, unknown>,
  parameters: ReadonlyArray<PuppetParameter>,
) => {
  const parameterIds = new Set(parameters.map((parameter) => parameter.id))
  const chains: ReadonlyArray<unknown> = Array.isArray(physics.chains) ? physics.chains : []
  return (
    (physics.chains === undefined || Array.isArray(physics.chains)) &&
    chains.every((chain) => isChain(chain, parameterIds)) &&
    new Set(chains.map((chain) => (isRecord(chain) ? chain.id : undefined))).size ===
      chains.length &&
    (physics.fps === undefined ||
      (isFiniteNumber(physics.fps) &&
        physics.fps >= 0 &&
        physics.fps <= MAXIMUM_PUPPET_FRAMES_PER_SECOND)) &&
    isVector(physics.gravity) &&
    (physics.gravity === undefined ||
      (physics.gravity as Array<number>).some((part) => part !== 0)) &&
    isVector(physics.wind)
  )
}
