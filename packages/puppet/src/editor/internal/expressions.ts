import type {
  PuppetDocument,
  PuppetExpression,
  PuppetExpressionParameter,
} from '../../player/document'
import {hasValidExpressions} from '../../player/internal/parse-expression'
import {acceptName, createUniqueName} from './preset-ids'

const EXPRESSION_NAME = '표정'

const getExpressions = (document: PuppetDocument) => document.expressions ?? []

const withExpressions = (
  document: PuppetDocument,
  expressions: ReadonlyArray<PuppetExpression>,
): PuppetDocument | undefined =>
  hasValidExpressions(expressions, document.parameters ?? [])
    ? {...document, expressions: expressions.length === 0 ? undefined : expressions}
    : undefined

const mapExpression = (
  document: PuppetDocument,
  expressionId: string,
  update: (expression: PuppetExpression) => PuppetExpression,
) =>
  getExpressions(document).some((expression) => expression.id === expressionId)
    ? withExpressions(
        document,
        getExpressions(document).map((expression) =>
          expression.id === expressionId ? update(expression) : expression,
        ),
      )
    : undefined

/** Expressions that set `parameterId`, with their entry for it. */
export const getParameterExpressions = (document: PuppetDocument, parameterId: string) =>
  getExpressions(document).flatMap((expression) => {
    const entry = expression.parameters.find((parameter) => parameter.parameterId === parameterId)
    return entry === undefined ? [] : [{entry, expression}]
  })

/** Creates an expression overwriting `parameterId` with `value`; returns its ID with the document. */
export const addExpression = (document: PuppetDocument, parameterId: string, value: number) => {
  const id = createUniqueName(
    EXPRESSION_NAME,
    getExpressions(document).map((expression) => expression.id),
  )
  const next = withExpressions(document, [
    ...getExpressions(document),
    {id, parameters: [{blend: 'overwrite', parameterId, value}]},
  ])
  return next === undefined ? undefined : {document: next, id}
}

export const removeExpression = (document: PuppetDocument, expressionId: string) =>
  withExpressions(
    document,
    getExpressions(document).filter((expression) => expression.id !== expressionId),
  )

/**
 * Renames an expression; empty or duplicate names are rejected. Returns the accepted ID (the
 * name may be normalized, for example trimmed) with the document.
 */
export const renameExpression = (document: PuppetDocument, expressionId: string, name: string) => {
  const id = acceptName(
    name,
    expressionId,
    getExpressions(document).map((expression) => expression.id),
  )
  if (id === undefined) {
    return undefined
  }
  const next = mapExpression(document, expressionId, (expression) => ({...expression, id}))
  return next === undefined ? undefined : {document: next, id}
}

export const setExpressionFade = (
  document: PuppetDocument,
  expressionId: string,
  fade: Pick<PuppetExpression, 'fadeInTime' | 'fadeOutTime'>,
) => mapExpression(document, expressionId, (expression) => ({...expression, ...fade}))

/** Adds or replaces the expression's entry for `entry.parameterId`. */
export const setExpressionParameter = (
  document: PuppetDocument,
  expressionId: string,
  entry: PuppetExpressionParameter,
) =>
  mapExpression(document, expressionId, (expression) => ({
    ...expression,
    parameters: expression.parameters.some(
      (parameter) => parameter.parameterId === entry.parameterId,
    )
      ? expression.parameters.map((parameter) =>
          parameter.parameterId === entry.parameterId ? entry : parameter,
        )
      : [...expression.parameters, entry],
  }))

export const removeExpressionParameter = (
  document: PuppetDocument,
  expressionId: string,
  parameterId: string,
) =>
  mapExpression(document, expressionId, (expression) => ({
    ...expression,
    parameters: expression.parameters.filter((parameter) => parameter.parameterId !== parameterId),
  }))
