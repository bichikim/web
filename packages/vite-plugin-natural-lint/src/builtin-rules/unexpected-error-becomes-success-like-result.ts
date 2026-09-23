import ts from '@typescript/typescript6'
import type {
  ChoiceDecisionAnswer,
  FileContext,
  NaturalLintRule,
  RuleInspection,
  UnexpectedErrorBecomesSuccessLikeResultOverride,
} from '../types'

const STRUCTURED_MARGIN = 0.2
const STRUCTURED_THRESHOLD = 0.8
const DEFAULT_PRIMARY_OPERATION_PREFIXES = ['fetch', 'query', 'request'] as const

const descendants = <Node extends ts.Node>(
  root: ts.Node,
  accepts: (node: ts.Node) => node is Node,
): Node[] => {
  const matches: Node[] = []
  const visit = (node: ts.Node): void => {
    if (accepts(node)) {
      matches.push(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(root)
  return matches
}

const scopedDescendants = <Node extends ts.Node>(
  root: ts.Node,
  accepts: (node: ts.Node) => node is Node,
): Node[] => {
  const matches: Node[] = []
  const visit = (node: ts.Node): void => {
    if (node !== root && (ts.isCatchClause(node) || ts.isFunctionLike(node))) {
      return
    }
    if (accepts(node)) {
      matches.push(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(root)
  return matches
}

const propertyName = (property: ts.ObjectLiteralElementLike, sourceFile: ts.SourceFile): string =>
  property.name === undefined ? '' : property.name.getText(sourceFile).replaceAll(/["']/gu, '')

const isSuccessLikeExpression = (expression: ts.Expression | undefined): boolean =>
  expression === undefined ||
  expression.kind === ts.SyntaxKind.NullKeyword ||
  expression.kind === ts.SyntaxKind.FalseKeyword ||
  (ts.isIdentifier(expression) && expression.text === 'undefined') ||
  (ts.isArrayLiteralExpression(expression) && expression.elements.length === 0) ||
  (ts.isObjectLiteralExpression(expression) && expression.properties.length === 0)

const isExplicitFailureExpression = (
  expression: ts.Expression | undefined,
  sourceFile: ts.SourceFile,
): boolean => {
  if (expression === undefined || !ts.isObjectLiteralExpression(expression)) {
    return false
  }
  return expression.properties.some((property) => {
    if (!ts.isPropertyAssignment(property)) {
      return false
    }
    const name = propertyName(property, sourceFile)
    const value = property.initializer.getText(sourceFile)
    return (
      (name === 'error' &&
        property.initializer.kind !== ts.SyntaxKind.NullKeyword &&
        !(ts.isIdentifier(property.initializer) && property.initializer.text === 'undefined')) ||
      (name === 'ok' && value === 'false') ||
      (name === 'success' && value === 'false') ||
      (name === 'status' && /['"](?:error|failure)['"]/u.test(value))
    )
  })
}

const enclosingScope = (node: ts.Node): ts.Node => {
  let current = node.parent
  while (current !== undefined && !ts.isSourceFile(current) && !ts.isFunctionLike(current)) {
    current = current.parent
  }
  return current ?? node.getSourceFile()
}

const documentedScopeText = (node: ts.Node, sourceFile: ts.SourceFile): string => {
  let scope = enclosingScope(node)
  while (scope.parent !== undefined && !ts.isSourceFile(scope) && !ts.isStatement(scope)) {
    scope = scope.parent
  }
  return scope.getFullText(sourceFile)
}

const DOCUMENTED_FALLBACK = new RegExp(
  [
    String.raw`best[- ]effort`,
    String.raw`falls? back[^\n]*(?:missing|not found|unavailable|invalid|failure|fails?)`,
    String.raw`returns? (?:undefined|null) only when no [^\n]+ exists`,
    String.raw`returns? (?:undefined|null|an empty)[^\n]*(?:missing|not found|unavailable|optional)`,
  ].join('|'),
  'iu',
)

const inspectCatch = (
  clause: ts.CatchClause,
  sourceFile: ts.SourceFile,
  primaryOperationPrefixes: ReadonlyArray<string>,
): RuleInspection => {
  const returns = scopedDescendants(clause.block, ts.isReturnStatement)
  const tryBlock = ts.isTryStatement(clause.parent) ? clause.parent.tryBlock : undefined
  const successfulReturns =
    tryBlock === undefined ? [] : scopedDescendants(tryBlock, ts.isReturnStatement)
  const primaryCalls = (
    tryBlock === undefined ? [] : scopedDescendants(tryBlock, ts.isCallExpression)
  )
    .map(callName)
    .filter((name) => primaryOperationPrefixes.some((prefix) => name.startsWith(prefix)))
  const catchConditions = scopedDescendants(clause.block, ts.isIfStatement).map((node) =>
    node.expression.getText(sourceFile),
  )
  const hasSpecificGuard = catchConditions.some((condition) =>
    /(?:instanceof|\.code|\.status|['"](?:code|status)['"]\s+in\s+)/u.test(condition),
  )
  const rethrowsUnmatchedErrors = scopedDescendants(clause.block, ts.isThrowStatement).length > 0
  const returnsSuccessLike = returns.some(({expression}) => isSuccessLikeExpression(expression))
  const returnsExplicitFailure = returns.some(({expression}) =>
    isExplicitFailureExpression(expression, sourceFile),
  )
  const hasBooleanFailurePair =
    returns.some(({expression}) => expression?.kind === ts.SyntaxKind.FalseKeyword) &&
    successfulReturns.some(({expression}) => expression?.kind === ts.SyntaxKind.TrueKeyword)
  const documentedFallback = DOCUMENTED_FALLBACK.test(documentedScopeText(clause, sourceFile))
  if (returnsExplicitFailure || hasBooleanFailurePair) {
    return {reason: 'explicit-failure-result', status: 'pass'}
  }
  if (returnsSuccessLike && hasSpecificGuard && rethrowsUnmatchedErrors && documentedFallback) {
    return {reason: 'specific-expected-failure-only', status: 'pass'}
  }
  if (returns.length > 0 && documentedFallback) {
    return {reason: 'documented-fallback-contract', status: 'pass'}
  }
  if (
    returnsSuccessLike &&
    primaryCalls.length > 0 &&
    !hasSpecificGuard &&
    !rethrowsUnmatchedErrors
  ) {
    return {reason: 'primary-operation-failure-hidden', status: 'fail'}
  }
  return {
    reason: 'fallback-contract-needs-semantic-review',
    state: {
      catchConditions,
      documentedFallback,
      hasBooleanFailurePair,
      hasSpecificGuard,
      nonCatchReturns: successfulReturns.map(
        ({expression}) => expression?.getText(sourceFile) ?? '',
      ),
      primaryCalls,
      rethrowsUnmatchedErrors,
      returnedFallbacks: returns.map(({expression}) => expression?.getText(sourceFile) ?? ''),
      returnsExplicitFailure,
      returnsSuccessLike,
    },
    status: 'unknown',
  }
}

const callName = (call: ts.CallExpression): string => {
  if (ts.isIdentifier(call.expression)) {
    return call.expression.text
  }
  if (ts.isPropertyAccessExpression(call.expression)) {
    return call.expression.name.text
  }
  return ''
}

const validatePrefixes = (
  override: UnexpectedErrorBecomesSuccessLikeResultOverride,
): ReadonlyArray<string> => {
  if (
    override.options !== undefined &&
    (typeof override.options !== 'object' ||
      override.options === null ||
      Array.isArray(override.options))
  ) {
    throw new TypeError('Built-in rule options must be an object.')
  }
  const prefixes = override.options?.primaryOperationPrefixes ?? DEFAULT_PRIMARY_OPERATION_PREFIXES
  if (!Array.isArray(prefixes)) {
    throw new TypeError('primaryOperationPrefixes must be an array.')
  }
  if (prefixes.length === 0) {
    throw new TypeError('primaryOperationPrefixes requires at least one prefix.')
  }
  if (prefixes.some((prefix) => typeof prefix !== 'string' || prefix.trim().length === 0)) {
    throw new TypeError('primaryOperationPrefixes must contain non-empty prefixes.')
  }
  return [...prefixes]
}

const choiceAnswer = (answer: unknown, identifier: string): ChoiceDecisionAnswer => {
  if (typeof answer !== 'object' || answer === null || !('type' in answer)) {
    throw new TypeError(`The built-in rule requires a ${identifier} answer.`)
  }
  if (answer.type !== 'choice') {
    throw new TypeError(`The built-in rule requires a ${identifier} choice answer.`)
  }
  return answer as ChoiceDecisionAnswer
}

const inspectUnexpectedErrors = (
  {sourceFile}: FileContext,
  primaryOperationPrefixes: ReadonlyArray<string>,
): RuleInspection => {
  const catches = descendants(sourceFile, ts.isCatchClause)
  const inspections = catches.map((clause) =>
    inspectCatch(clause, sourceFile, primaryOperationPrefixes),
  )
  const failed = inspections.find(({status}) => status === 'fail')
  if (failed !== undefined) {
    return failed
  }
  if (inspections.length > 0 && inspections.every(({status}) => status === 'pass')) {
    return inspections[0]!
  }
  return {
    reason: 'fallback-contract-needs-semantic-review',
    state: inspections.flatMap((inspection) =>
      inspection.status === 'unknown' ? [inspection.state] : [],
    ),
    status: 'unknown',
  }
}

export const createUnexpectedErrorBecomesSuccessLikeResultRule = (
  override: UnexpectedErrorBecomesSuccessLikeResultOverride = {},
): NaturalLintRule => {
  const primaryOperationPrefixes = validatePrefixes(override)
  return {
    cacheKey: [
      'builtin-v1',
      primaryOperationPrefixes.join(','),
      ...(override.cacheKey === undefined ? [] : [override.cacheKey]),
    ].join(':'),
    expected: override.expected,
    id: '@natural-lint/unexpected-error-becomes-success-like-result',
    inspect: (context) => inspectUnexpectedErrors(context, primaryOperationPrefixes),
    message:
      override.message ??
      'Unexpected failures must not become values that callers can confuse with absence or ordinary success.',
    questions: {
      caughtScope: {
        criteria: {
          broad:
            'The catch can intercept unexpected infrastructure, authorization, or programming failures.',
          insufficient: 'The evidence does not establish which failures the catch can intercept.',
          specific:
            'The catch is limited to a documented and expected domain absence or condition.',
        },
        instruction: 'What failure scope can the catch convert?',
        type: 'choice',
      },
      resultSemantics: {
        criteria: {
          documentedFallback:
            'The normal-looking fallback is explicitly part of the function contract.',
          explicitFailure:
            'The returned value explicitly represents failure and cannot be confused with success.',
          insufficient: 'The evidence does not establish the meaning of the returned value.',
          successLike:
            'The failure becomes a value callers can confuse with absence or ordinary success.',
        },
        instruction: 'How does the catch communicate the failure to its caller?',
        type: 'choice',
      },
    },
    reduce: ({answers}) => {
      const caughtScope = choiceAnswer(answers.caughtScope, 'caughtScope')
      const resultSemantics = choiceAnswer(answers.resultSemantics, 'resultSemantics')
      const broad = caughtScope.probabilities.broad ?? 0
      const specific = caughtScope.probabilities.specific ?? 0
      const successLike = resultSemantics.probabilities.successLike ?? 0
      const allowed = Math.max(
        resultSemantics.probabilities.documentedFallback ?? 0,
        resultSemantics.probabilities.explicitFailure ?? 0,
      )
      const violationProbability = Math.min(broad, successLike)
      if (broad >= STRUCTURED_THRESHOLD && successLike >= STRUCTURED_THRESHOLD) {
        return {
          probability: violationProbability,
          reason: 'broad-success-like-fallback',
          status: 'fail',
        }
      }
      const allowedMargin = allowed - successLike
      if (
        specific >= STRUCTURED_THRESHOLD &&
        allowed >= STRUCTURED_THRESHOLD &&
        allowedMargin >= STRUCTURED_MARGIN
      ) {
        return {
          probability: violationProbability,
          reason: 'explicitly-allowed-fallback',
          status: 'pass',
        }
      }
      return {
        probability: violationProbability,
        reason: 'insufficient-contract',
        status: 'uncertain',
      }
    },
    select: override.select,
    severity: override.severity ?? 'experiment',
  }
}
