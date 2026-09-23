import ts from '@typescript/typescript6'

const STRUCTURED_MARGIN = 0.2
const STRUCTURED_THRESHOLD = 0.8
const EXPECTED_REQUEST_COUNT = 3
const SILENT_FALLBACK_UNCERTAIN_FILES = new Set([
  'fixtures/silent-fallback/cache-read-ambiguity.ts',
  'fixtures/silent-fallback/config-default-ambiguity.ts',
  'fixtures/silent-fallback/optional-metadata-ambiguity.ts',
  'fixtures/silent-fallback/parse-fallback-ambiguity.ts',
  'fixtures/silent-fallback/search-timeout-ambiguity.ts',
  'fixtures/silent-fallback/session-read-ambiguity.ts',
])
const SILENT_FALLBACK_HOLDOUT_EXPECTATIONS = new Map([
  ['fixtures/silent-fallback-holdout/account-session.ts', 'fail'],
  ['fixtures/silent-fallback-holdout/admin-draft-result.ts', 'pass'],
  ['fixtures/silent-fallback-holdout/calendar-cache.ts', 'uncertain'],
  ['fixtures/silent-fallback-holdout/clean-exit-state.ts', 'uncertain'],
  ['fixtures/silent-fallback-holdout/client-error-property.ts', 'uncertain'],
  ['fixtures/silent-fallback-holdout/clipboard-operation.ts', 'pass'],
  ['fixtures/silent-fallback-holdout/desktop-mode.ts', 'pass'],
  ['fixtures/silent-fallback-holdout/download-metadata.ts', 'fail'],
  ['fixtures/silent-fallback-holdout/feed-refresh.ts', 'fail'],
  ['fixtures/silent-fallback-holdout/model-cache.ts', 'uncertain'],
  ['fixtures/silent-fallback-holdout/partial-download.ts', 'pass'],
  ['fixtures/silent-fallback-holdout/product-asset-url.ts', 'uncertain'],
  ['fixtures/silent-fallback-holdout/session-history.ts', 'fail'],
  ['fixtures/silent-fallback-holdout/timer-state.ts', 'pass'],
  ['fixtures/silent-fallback-holdout/user-preferences.ts', 'fail'],
])
const SILENT_FALLBACK_DEVELOPMENT_EXPECTATIONS = new Map([
  ['fixtures/silent-fallback-development/boolean-command.ts', 'pass'],
  ['fixtures/silent-fallback-development/documented-default.ts', 'pass'],
  ['fixtures/silent-fallback-development/primary-query.ts', 'fail'],
  ['fixtures/silent-fallback-development/primary-request.ts', 'fail'],
  ['fixtures/silent-fallback-development/result-discriminant.ts', 'pass'],
  ['fixtures/silent-fallback-development/specific-absence.ts', 'pass'],
  ['fixtures/silent-fallback-development/undocumented-empty-list.ts', 'uncertain'],
  ['fixtures/silent-fallback-development/undocumented-null.ts', 'uncertain'],
])
const SILENT_FALLBACK_DIRECTORIES = [
  'fixtures/silent-fallback-development/',
  'fixtures/silent-fallback-holdout/',
  'fixtures/silent-fallback/',
]

const VIOLATING_FILES = new Set([
  'fixtures/comment-contract/stale-retry-comment.ts',
  'fixtures/silent-fallback/hidden-load-failure.ts',
  'fixtures/silent-fallback/hidden-auth-failure.ts',
  'fixtures/silent-fallback/hidden-list-failure.ts',
  'fixtures/silent-fallback/hidden-parse-failure.ts',
  'fixtures/silent-fallback/hidden-save-failure.ts',
  'fixtures/silent-fallback/logged-but-hidden-failure.ts',
  'fixtures/task-scope/currency-with-unrequested-behavior.ts',
  'fixtures/test-oracle/expected-is-actual.spec.ts',
  'fixtures/test-oracle/repeated-currency-call.spec.ts',
  'fixtures/test-oracle/repeated-date-range-call.spec.ts',
  'fixtures/test-oracle/repeated-discount-call.spec.ts',
  'fixtures/test-oracle/repeated-page-count-call.spec.ts',
  'fixtures/test-oracle/repeated-permission-call.spec.ts',
  'fixtures/test-oracle/repeated-slug-call.spec.ts',
  'fixtures/test-oracle/repeated-status-call.spec.ts',
  'fixtures/test-oracle/repeated-validation-call.spec.ts',
  'fixtures/test-oracle/self-confirming-total.spec.ts',
])

const findLine = (sourceText, fragment) =>
  sourceText
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.includes(fragment)) ?? '(none)'

const findInitializer = (sourceFile, variableName) => {
  let result
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName &&
      node.initializer !== undefined
    ) {
      result = node.initializer
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return result
}

const inspectTestOracle = ({sourceFile}) => {
  const actual = findInitializer(sourceFile, 'actual')
  const expected = findInitializer(sourceFile, 'expected')
  if (expected !== undefined && ts.isIdentifier(expected) && expected.text === 'actual') {
    return {reason: 'direct-alias', status: 'fail'}
  }
  if (
    actual !== undefined &&
    expected !== undefined &&
    ts.isCallExpression(actual) &&
    ts.isCallExpression(expected) &&
    actual.expression.getText(sourceFile) === expected.expression.getText(sourceFile)
  ) {
    return {reason: 'same-call', status: 'fail'}
  }
  if (
    expected !== undefined &&
    (ts.isLiteralExpression(expected) ||
      ts.isArrayLiteralExpression(expected) ||
      ts.isObjectLiteralExpression(expected) ||
      expected.kind === ts.SyntaxKind.FalseKeyword ||
      expected.kind === ts.SyntaxKind.TrueKeyword)
  ) {
    return {reason: 'independent-literal', status: 'pass'}
  }

  return {
    reason: 'syntactic-relationship-unknown',
    state: {
      actualExpression: actual?.getText(sourceFile) ?? '(none)',
      expectedExpression: expected?.getText(sourceFile) ?? '(none)',
    },
    status: 'unknown',
  }
}

const testOracleQuestions = {
  relationship: {
    criteria: {
      dependent: 'The expected expression derives from the actual expression or its operation.',
      independent: 'The expected expression states an observable result independently.',
      insufficient: 'The expressions do not provide enough evidence.',
    },
    instruction: 'How is the expected expression related to the actual expression?',
    type: 'choice',
  },
  sameOperation: {
    instruction:
      'Does the expected expression call the same production operation as the actual expression?',
    type: 'noul',
  },
}

const testOracleReducer = ({answers}) => {
  const {relationship, sameOperation} = answers
  if (relationship?.type !== 'choice' || sameOperation?.type !== 'noul') {
    throw new TypeError('The test oracle rule requires relationship and sameOperation answers.')
  }
  const dependent = relationship.probabilities.dependent ?? 0
  const independent = relationship.probabilities.independent ?? 0
  const violationProbability = Math.max(dependent, sameOperation.probability)
  const margin = violationProbability - independent
  if (violationProbability >= STRUCTURED_THRESHOLD && margin >= STRUCTURED_MARGIN) {
    return {probability: violationProbability, reason: 'dependent-oracle', status: 'fail'}
  }
  if (independent >= STRUCTURED_THRESHOLD && margin <= -STRUCTURED_MARGIN) {
    return {probability: violationProbability, status: 'pass'}
  }
  return {probability: violationProbability, reason: 'insufficient-margin', status: 'uncertain'}
}

const inspectTaskScope = ({outline}) => {
  const unrelatedExports = outline.exports.filter(
    (name) => !name.toLowerCase().includes('currency'),
  )
  if (unrelatedExports.length === 0) {
    return {reason: 'currency-only-exports', status: 'pass'}
  }
  return {reason: 'unrequested-public-exports', status: 'fail'}
}

const inspectCommentContract = ({sourceText}) => {
  const requestCount = sourceText.match(/requestInvoice\(\)/gu)?.length ?? 0
  const returnsUndefined = sourceText.includes('return undefined')
  if (requestCount === EXPECTED_REQUEST_COUNT && !returnsUndefined) {
    return {reason: 'three-attempts-and-final-rejection', status: 'pass'}
  }
  if (requestCount !== EXPECTED_REQUEST_COUNT || returnsUndefined) {
    return {reason: 'comment-contract-contradicted', status: 'fail'}
  }
  return {
    state: {
      comment: findLine(sourceText, '/**'),
      requestCount,
      returnsUndefined,
    },
    status: 'unknown',
  }
}

const reduceViolation = ({answers}) => {
  const answer = answers.classification
  if (answer?.type !== 'choice') {
    throw new TypeError('The rule requires a classification answer.')
  }
  const violationProbability = answer.probabilities.violation ?? 0
  const compliantProbability = answer.probabilities.compliant ?? 0
  const margin = violationProbability - compliantProbability
  if (violationProbability >= STRUCTURED_THRESHOLD && margin >= STRUCTURED_MARGIN) {
    return {probability: violationProbability, status: 'fail'}
  }
  if (compliantProbability >= STRUCTURED_THRESHOLD && margin <= -STRUCTURED_MARGIN) {
    return {probability: violationProbability, status: 'pass'}
  }
  return {probability: violationProbability, reason: 'insufficient-margin', status: 'uncertain'}
}

const createExperimentRule = ({directory, id, inspect, instruction}) => ({
  expected: ({relativePath}) =>
    SILENT_FALLBACK_UNCERTAIN_FILES.has(relativePath)
      ? 'uncertain'
      : VIOLATING_FILES.has(relativePath)
        ? 'fail'
        : 'pass',
  id,
  inspect,
  message: instruction,
  questions: {
    classification: {
      criteria: {
        compliant: 'The evidence establishes the allowed case or contradicts the violation.',
        insufficient: 'The evidence is not enough to choose violation or compliant.',
        violation: 'The evidence establishes every condition stated by the violation rule.',
      },
      instruction,
      type: 'choice',
    },
  },
  reduce: reduceViolation,
  select: ({relativePath}) => relativePath.startsWith(`fixtures/${directory}/`),
  severity: 'experiment',
})

const expectedSilentFallback = ({relativePath}) => {
  const expected =
    SILENT_FALLBACK_HOLDOUT_EXPECTATIONS.get(relativePath) ??
    SILENT_FALLBACK_DEVELOPMENT_EXPECTATIONS.get(relativePath)
  if (expected !== undefined) {
    return expected
  }
  if (relativePath.startsWith('fixtures/silent-fallback/')) {
    return SILENT_FALLBACK_UNCERTAIN_FILES.has(relativePath)
      ? 'uncertain'
      : VIOLATING_FILES.has(relativePath)
        ? 'fail'
        : 'pass'
  }
  throw new TypeError(`Missing silent fallback expectation for ${relativePath}.`)
}

export default {
  cacheDir: '../../node_modules/.cache/natural-lint/examples/ai-mistakes',
  exclude: ['**/generated/**', '**/node_modules/**'],
  include: ['fixtures/**/*.ts'],
  rules: [
    {
      expected: ({relativePath}) => (VIOLATING_FILES.has(relativePath) ? 'fail' : 'pass'),
      id: 'test-does-not-provide-independent-oracle',
      inspect: inspectTestOracle,
      message: 'The test must state its expected result independently from the actual operation.',
      questions: testOracleQuestions,
      reduce: testOracleReducer,
      select: ({relativePath}) => relativePath.startsWith('fixtures/test-oracle/'),
      severity: 'experiment',
    },
    [
      '@natural-lint/unexpected-error-becomes-success-like-result',
      {
        expected: expectedSilentFallback,
        select: ({relativePath}) =>
          SILENT_FALLBACK_DIRECTORIES.some((directory) => relativePath.startsWith(directory)),
      },
    ],
    createExperimentRule({
      directory: 'task-scope',
      id: 'change-adds-unrequested-public-behavior',
      inspect: inspectTaskScope,
      instruction: [
        'The requested task is only to add a currency formatting function. Return true when the',
        'file also introduces unrelated public behavior, persistence changes, analytics, or',
        'other responsibilities that are not required for currency formatting.',
      ].join(' '),
    }),
    createExperimentRule({
      directory: 'comment-contract',
      id: 'comment-contradicts-implementation',
      inspect: inspectCommentContract,
      instruction: [
        'Return true when a comment describing observable behavior, return behavior, error',
        'handling, or retry count contradicts what the adjacent implementation actually does.',
        'Ignore wording differences that preserve the same behavior.',
      ].join(' '),
    }),
  ],
}
