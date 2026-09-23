const EXPECTED_FAILURES = new Set(['src/load-profile.ts'])
const MARGIN = 0.2
const THRESHOLD = 0.8

const instruction = [
  'Classify the catch behavior from the supplied facts.',
  'Choose violation only when an unexpected error becomes undefined without being logged,',
  're-thrown, or translated into an explicitly documented domain result.',
  'Choose compliant when a specific expected absence becomes undefined and all other errors',
  'are preserved.',
].join(' ')

export default {
  include: ['src/**/*.ts'],
  rules: [
    {
      expected: ({relativePath}) => (EXPECTED_FAILURES.has(relativePath) ? 'fail' : 'pass'),
      id: 'catch-does-not-hide-unexpected-error',
      inspect: ({sourceText}) => {
        if (!sourceText.includes('catch')) {
          return {reason: 'no-catch-clause', status: 'pass'}
        }
        return {
          state: {
            checksNotFound: sourceText.includes("error.code === 'NOT_FOUND'"),
            documentsMissingResult: sourceText.includes('@returns undefined when missing'),
            logsError: sourceText.includes('console.error'),
            rethrowsError: sourceText.includes('throw error'),
            returnsUndefined: sourceText.includes('return undefined'),
          },
          status: 'unknown',
        }
      },
      message: 'Unexpected errors must not be converted into a success-like result.',
      questions: {
        classification: {
          criteria: {
            compliant: 'Only documented absence is converted and other errors are preserved.',
            insufficient: 'The supplied facts do not establish either behavior.',
            violation: 'An unexpected error becomes undefined without preservation or reporting.',
          },
          instruction,
          type: 'choice',
        },
      },
      reduce: ({answers}) => {
        const answer = answers.classification
        if (answer?.type !== 'choice') {
          throw new TypeError('The rule requires a classification answer.')
        }
        const violation = answer.probabilities.violation ?? 0
        const compliant = answer.probabilities.compliant ?? 0
        if (violation >= THRESHOLD && violation - compliant >= MARGIN) {
          return {probability: violation, status: 'fail'}
        }
        if (compliant >= THRESHOLD && compliant - violation >= MARGIN) {
          return {probability: violation, status: 'pass'}
        }
        return {probability: violation, reason: 'insufficient-margin', status: 'uncertain'}
      },
      severity: 'experiment',
    },
  ],
}
