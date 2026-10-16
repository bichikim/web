import {PUPPET_EXPRESSION_BLENDS, type PuppetExpression, type PuppetParameter} from '../document'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isFadeTime = (value: unknown) => value === undefined || (isFiniteNumber(value) && value >= 0)

const isExpressionParameter = (value: unknown, parameterIds: ReadonlySet<string>) =>
  isRecord(value) &&
  PUPPET_EXPRESSION_BLENDS.some((blend) => blend === value.blend) &&
  typeof value.parameterId === 'string' &&
  parameterIds.has(value.parameterId) &&
  isFiniteNumber(value.value)

const isExpression = (
  value: unknown,
  parameterIds: ReadonlySet<string>,
): value is PuppetExpression =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  isFadeTime(value.fadeInTime) &&
  isFadeTime(value.fadeOutTime) &&
  Array.isArray(value.parameters) &&
  value.parameters.every((parameter) => isExpressionParameter(parameter, parameterIds)) &&
  new Set(value.parameters.map((parameter: {parameterId: string}) => parameter.parameterId))
    .size === value.parameters.length

/** Checks expression presets; each parameter appears at most once per expression. */
export const hasValidExpressions = (
  value: unknown,
  parameters: ReadonlyArray<PuppetParameter>,
): value is ReadonlyArray<PuppetExpression> | undefined => {
  if (value === undefined) {
    return true
  }
  if (!Array.isArray(value)) {
    return false
  }
  const parameterIds = new Set(parameters.map((parameter) => parameter.id))
  return (
    value.every((expression) => isExpression(expression, parameterIds)) &&
    new Set(value.map((expression: PuppetExpression) => expression.id)).size === value.length
  )
}
