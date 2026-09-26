import type {PuppetParameter, PuppetPendulum, PuppetPhysics} from '../document'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const hasParameter = (parameters: ReadonlyArray<PuppetParameter>, parameterId: unknown) =>
  typeof parameterId === 'string' &&
  parameterId.length > 0 &&
  parameters.some((parameter) => parameter.id === parameterId)

const hasFiniteScaledParameterRange = (
  parameters: ReadonlyArray<PuppetParameter>,
  parameterId: unknown,
  scale: unknown,
) => {
  if (typeof parameterId !== 'string' || !isFiniteNumber(scale)) {
    return false
  }

  const parameter = parameters.find((candidate) => candidate.id === parameterId)
  if (parameter === undefined) {
    return false
  }

  const deltas = [
    parameter.minimum - parameter.defaultValue,
    parameter.maximum - parameter.defaultValue,
  ]
  return deltas.every((delta) => Number.isFinite(delta) && Number.isFinite(delta * scale))
}

const hasFiniteSpringRate = (gravity: unknown, length: unknown) =>
  isFiniteNumber(gravity) && isFiniteNumber(length) && Number.isFinite(gravity / length)

const isPendulum = (
  value: unknown,
  parameters: ReadonlyArray<PuppetParameter>,
): value is PuppetPendulum =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  hasParameter(parameters, value.inputParameterId) &&
  hasParameter(parameters, value.outputParameterId) &&
  value.inputParameterId !== value.outputParameterId &&
  isFiniteNumber(value.inputScale) &&
  isFiniteNumber(value.outputScale) &&
  (value.outputMode === undefined ||
    value.outputMode === 'position' ||
    value.outputMode === 'lag') &&
  isFiniteNumber(value.gravity) &&
  value.gravity > 0 &&
  isFiniteNumber(value.length) &&
  value.length > 0 &&
  isFiniteNumber(value.damping) &&
  value.damping >= 0 &&
  hasFiniteSpringRate(value.gravity, value.length) &&
  hasFiniteScaledParameterRange(parameters, value.inputParameterId, value.inputScale)

export const hasValidPhysics = (
  value: unknown,
  parameters: ReadonlyArray<PuppetParameter>,
): value is PuppetPhysics => {
  if (value === undefined) {
    return true
  }
  if (!isRecord(value) || !Array.isArray(value.pendulums)) {
    return false
  }

  const {pendulums} = value
  return (
    pendulums.every((pendulum) => isPendulum(pendulum, parameters)) &&
    new Set(pendulums.map((pendulum) => (isRecord(pendulum) ? pendulum.id : undefined))).size ===
      pendulums.length &&
    new Set(
      pendulums.map((pendulum) => (isRecord(pendulum) ? pendulum.outputParameterId : undefined)),
    ).size === pendulums.length
  )
}
