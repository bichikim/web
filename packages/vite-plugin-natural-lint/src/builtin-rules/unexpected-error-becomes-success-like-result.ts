import ts from '@typescript/typescript6'
import type {
  ChoiceDecisionAnswer,
  FileContext,
  NaturalLintRule,
  RuleInspection,
  RuleInspectionDecision,
  RuleUnknownInspection,
  UnexpectedErrorBecomesSuccessLikeResultOverride,
} from '../types'

const STRUCTURED_MARGIN = 0.2
const STRUCTURED_THRESHOLD = 0.8
const FUNCTION_CONTEXT_LIMIT = 700
const FUNCTION_TAIL_LIMIT = 500
const BLOCK_CONTEXT_LIMIT = 600
const CALLER_STATEMENT_LIMIT = 360
const CONTRACT_CONTEXT_LIMIT = 400
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
      (name === 'status' &&
        ts.isStringLiteral(property.initializer) &&
        ['error', 'failed', 'failure'].includes(property.initializer.text))
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

const compactSource = (node: ts.Node, sourceFile: ts.SourceFile, limit: number): string =>
  node.getText(sourceFile).slice(0, limit)

const scopeName = (scope: ts.Node): string | undefined => {
  if (ts.isFunctionDeclaration(scope) || ts.isMethodDeclaration(scope)) {
    return scope.name?.getText()
  }
  if (
    (ts.isArrowFunction(scope) || ts.isFunctionExpression(scope)) &&
    ts.isVariableDeclaration(scope.parent)
  ) {
    return scope.parent.name.getText()
  }
  return undefined
}

const enclosingFunctionSource = (clause: ts.CatchClause, sourceFile: ts.SourceFile): string => {
  const scope = enclosingScope(clause)
  const declaration =
    scope.parent !== undefined && ts.isVariableDeclaration(scope.parent) ? scope.parent : scope
  return compactSource(declaration, sourceFile, FUNCTION_CONTEXT_LIMIT)
}

const scopeTail = (scope: ts.Node, sourceFile: ts.SourceFile): string =>
  scope.getText(sourceFile).slice(-FUNCTION_TAIL_LIMIT)

const enclosingFunctionTail = (clause: ts.CatchClause, sourceFile: ts.SourceFile): string => {
  const scope = enclosingScope(clause)
  return scope.getWidth(sourceFile) > FUNCTION_CONTEXT_LIMIT ? scopeTail(scope, sourceFile) : ''
}

const outerFunctionTail = (clause: ts.CatchClause, sourceFile: ts.SourceFile): string => {
  const outer = enclosingScope(enclosingScope(clause))
  return ts.isSourceFile(outer) ? '' : scopeTail(outer, sourceFile)
}

const leadingContract = (node: ts.Node, sourceFile: ts.SourceFile): string =>
  node
    .getFullText(sourceFile)
    .slice(0, node.getStart(sourceFile) - node.getFullStart())
    .trim()
    .slice(-CONTRACT_CONTEXT_LIMIT)

const enclosingContract = (clause: ts.CatchClause, sourceFile: ts.SourceFile): string => {
  let scope = enclosingScope(clause)
  while (!ts.isSourceFile(scope)) {
    const contract = leadingContract(scope, sourceFile)
    if (contract.length > 0) {
      return contract
    }
    scope = scope.parent ?? sourceFile
  }
  return ''
}

const callStatement = (call: ts.CallExpression): ts.Statement | undefined => {
  let current: ts.Node | undefined = call
  while (current !== undefined && !ts.isSourceFile(current)) {
    if (ts.isStatement(current)) {
      return current
    }
    current = current.parent
  }
  return undefined
}

const localCaller = (clause: ts.CatchClause, sourceFile: ts.SourceFile): string => {
  const scope = enclosingScope(clause)
  const name = scopeName(scope)
  if (name === undefined) {
    return ''
  }
  const caller = descendants(sourceFile, ts.isCallExpression).find(
    (call) =>
      ts.isIdentifier(call.expression) &&
      call.expression.text === name &&
      (call.pos < scope.pos || call.end > scope.end),
  )
  if (caller === undefined) {
    return ''
  }
  const statement = callStatement(caller)
  if (statement === undefined) {
    return ''
  }
  const siblings =
    ts.isBlock(statement.parent) || ts.isSourceFile(statement.parent)
      ? statement.parent.statements
      : undefined
  const next = siblings?.[siblings.indexOf(statement) + 1]
  return [statement, next]
    .filter((node): node is ts.Statement => node !== undefined)
    .map((node) => compactSource(node, sourceFile, CALLER_STATEMENT_LIMIT))
    .join('\n')
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

const endsWithUnconditionalThrow = (
  clause: ts.CatchClause,
  returns: ReadonlyArray<ts.ReturnStatement>,
): boolean => {
  const lastStatement = clause.block.statements.at(-1)
  return returns.length === 0 && lastStatement !== undefined && ts.isThrowStatement(lastStatement)
}

const endsWithSuccessLikeReturn = (clause: ts.CatchClause): boolean => {
  const statement = clause.block.statements.at(-1)
  return (
    statement !== undefined &&
    ts.isReturnStatement(statement) &&
    isSuccessLikeExpression(statement.expression)
  )
}

const inspectCatch = (
  clause: ts.CatchClause,
  sourceFile: ts.SourceFile,
  primaryOperationPrefixes: ReadonlyArray<string>,
): RuleInspectionDecision | RuleUnknownInspection => {
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
  if (endsWithUnconditionalThrow(clause, returns)) {
    return {reason: 'unconditional-rethrow', status: 'pass'}
  }
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
    endsWithSuccessLikeReturn(clause) &&
    primaryCalls.length > 0 &&
    !hasSpecificGuard &&
    !rethrowsUnmatchedErrors
  ) {
    return {reason: 'primary-operation-failure-hidden', status: 'fail'}
  }
  return {
    reason: 'fallback-contract-needs-semantic-review',
    state: {
      catchCalls: scopedDescendants(clause.block, ts.isCallExpression).map(callName),
      catchConditions,
      catchSource: compactSource(clause, sourceFile, BLOCK_CONTEXT_LIMIT),
      contract: enclosingContract(clause, sourceFile),
      documentedFallback,
      enclosingFunction: enclosingFunctionSource(clause, sourceFile),
      enclosingFunctionTail: enclosingFunctionTail(clause, sourceFile),
      hasBooleanFailurePair,
      hasSpecificGuard,
      localCaller: localCaller(clause, sourceFile),
      nonCatchReturns: successfulReturns.map(
        ({expression}) => expression?.getText(sourceFile) ?? '',
      ),
      outerFunctionTail: outerFunctionTail(clause, sourceFile),
      primaryCalls,
      rethrowsUnmatchedErrors,
      returnedFallbacks: returns.map(({expression}) => expression?.getText(sourceFile) ?? ''),
      returnsExplicitFailure,
      returnsSuccessLike,
      tryCalls:
        tryBlock === undefined
          ? []
          : scopedDescendants(tryBlock, ts.isCallExpression).map(callName),
      trySource:
        tryBlock === undefined ? '' : compactSource(tryBlock, sourceFile, BLOCK_CONTEXT_LIMIT),
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
  if (catches.length === 0) {
    return {reason: 'no-catch-clause', status: 'pass'}
  }
  const inspections = catches.map((clause) =>
    inspectCatch(clause, sourceFile, primaryOperationPrefixes),
  )
  return inspections.length === 1 ? inspections[0]! : {inspections, status: 'group'}
}

export const createUnexpectedErrorBecomesSuccessLikeResultRule = (
  override: UnexpectedErrorBecomesSuccessLikeResultOverride = {},
): NaturalLintRule => {
  const primaryOperationPrefixes = validatePrefixes(override)
  return {
    cacheKey: [
      'builtin-v7',
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
            'The fallback is part of the function contract and consumers cannot mistake failure for completed work.',
          explicitFailure:
            'A returned result, error state, or aggregate outcome explicitly exposes the failure to consumers.',
          insufficient:
            'The available contract and consumer evidence do not establish whether failure is hidden.',
          successLike:
            'Consumers can treat the fallback as genuine absence or success, including ' +
            'overwriting data after a failed read or omitting failures from a summary.',
        },
        instruction:
          'Use contract, enclosing and outer function tails, and caller evidence. ' +
          'A null, empty, or bare return alone does not prove hidden success; a fallback ' +
          'comment alone does not prove consumers preserve data. How is failure communicated?',
        type: 'choice',
      },
    },
    reduce: ({answers}) => {
      const caughtScope = choiceAnswer(answers.caughtScope, 'caughtScope')
      const resultSemantics = choiceAnswer(answers.resultSemantics, 'resultSemantics')
      const broad = caughtScope.probabilities.broad ?? 0
      const specific = caughtScope.probabilities.specific ?? 0
      const successLike = resultSemantics.probabilities.successLike ?? 0
      const explicitFailure = resultSemantics.probabilities.explicitFailure ?? 0
      const documentedFallback = resultSemantics.probabilities.documentedFallback ?? 0
      const allowed = Math.max(documentedFallback, explicitFailure)
      const violationProbability = Math.min(broad, successLike)
      if (broad >= STRUCTURED_THRESHOLD && successLike >= STRUCTURED_THRESHOLD) {
        return {
          probability: violationProbability,
          reason: 'broad-success-like-fallback',
          status: 'fail',
        }
      }
      if (
        explicitFailure >= STRUCTURED_THRESHOLD &&
        explicitFailure - successLike >= STRUCTURED_MARGIN
      ) {
        return {
          probability: violationProbability,
          reason: 'explicit-failure-result',
          status: 'pass',
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
        reason:
          caughtScope.choice === 'insufficient' || resultSemantics.choice === 'insufficient'
            ? 'insufficient-evidence'
            : 'below-decision-threshold',
        status: 'uncertain',
      }
    },
    select: override.select,
    severity: override.severity ?? 'experiment',
  }
}
