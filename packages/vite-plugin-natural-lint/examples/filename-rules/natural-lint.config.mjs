const MAXIMUM_FILENAME_WORDS = 3
const THRESHOLD = 0.8

const VIOLATING_FILES = new Set([
  'holdout/fail/assemble-customer-support-ticket-summary.ts',
  'holdout/fail/build-monthly-usage-billing-report.ts',
  'holdout/fail/calculate-discounted-order-checkout-total.ts',
  'holdout/fail/convert-uploaded-document-preview-image.ts',
  'holdout/fail/create-password-reset-email-message.ts',
  'holdout/fail/decode-signed-session-cookie-payload.ts',
  'holdout/fail/format-localized-product-price-label.ts',
  'holdout/fail/generate-account-activity-audit-entry.ts',
  'holdout/fail/load-current-user-notification-settings.ts',
  'holdout/fail/map-external-payment-provider-response.ts',
  'holdout/fail/normalize-imported-customer-phone-number.ts',
  'holdout/fail/parse-background-job-queue-message.ts',
  'holdout/fail/read-persisted-shopping-cart-state.ts',
  'holdout/fail/remove-expired-authentication-session-token.ts',
  'holdout/fail/resolve-feature-flag-evaluation-context.ts',
  'holdout/fail/serialize-api-error-response-body.ts',
  'holdout/fail/synchronize-user-preference-cloud-backup.ts',
  'holdout/fail/transform-legacy-database-record-shape.ts',
  'holdout/fail/validate-incoming-webhook-signature-header.ts',
  'holdout/fail/write-security-event-log-record.ts',
  'src/build-customer-account-profile-page.ts',
  'src/calculate-quarterly-subscription-renewal-price.ts',
  'src/calculate-shopping-cart-total-price.ts',
  'src/convert-user-profile-image-url.ts',
  'src/format-international-phone-number-display.ts',
  'src/generate-monthly-invoice-summary-report.ts',
  'src/normalize-uploaded-profile-avatar-image.ts',
  'src/parse-incoming-webhook-request-body.ts',
  'src/resolve-application-runtime-configuration-value.ts',
  'src/validate-external-redirect-target-url.ts',
])

const instruction = [
  'Return true when one of candidateExports can replace a filename of more than three words',
  'without losing the responsibility named by the file and its exports.',
  'Use only candidateExports; do not invent or combine names.',
  'Do not return true merely because the filename has more than three words.',
].join(' ')

const identifierWords = (value) =>
  value
    .replaceAll(/(?<lower>[a-z\d])(?<upper>[A-Z])/gu, '$<lower>-$<upper>')
    .toLowerCase()
    .split(/[^a-z\d]+/u)
    .filter(Boolean)

const inspectFilename = ({fileName, outline}) => {
  const filenameWords = fileName.words.join('-')
  if (
    outline.exports.some((exportName) => identifierWords(exportName).join('-') === filenameWords)
  ) {
    return {reason: 'filename-matches-export', status: 'pass'}
  }
  const filenameWordSet = new Set(fileName.words)
  const candidateExports = outline.exports.filter((exportName) => {
    const exportWords = identifierWords(exportName)
    return (
      exportWords.length <= MAXIMUM_FILENAME_WORDS &&
      exportWords.every((word) => filenameWordSet.has(word))
    )
  })
  if (candidateExports.length === 0) {
    return {reason: 'no-short-export-candidate', status: 'pass'}
  }
  return {
    state: {candidateExports, exports: outline.exports, filename: fileName.stem},
    status: 'unknown',
  }
}

export default {
  cacheDir: '../../node_modules/.cache/natural-lint/examples/filename-rules',
  include: ['holdout/**/*.ts', 'src/**/*.ts'],
  rules: [
    {
      expected: ({relativePath}) => (VIOLATING_FILES.has(relativePath) ? 'fail' : 'pass'),
      id: 'filename-is-unnecessarily-long',
      inspect: inspectFilename,
      message: instruction,
      questions: {violation: {instruction, type: 'noul'}},
      reduce: ({answers}) => {
        const answer = answers.violation
        if (answer?.type !== 'noul') {
          throw new TypeError('The filename rule requires a violation answer.')
        }
        return {
          probability: answer.probability,
          status:
            answer.probability >= THRESHOLD
              ? 'fail'
              : answer.probability <= 1 - THRESHOLD
                ? 'pass'
                : 'uncertain',
        }
      },
      select: ({fileName}) => fileName.words.length > MAXIMUM_FILENAME_WORDS,
      severity: 'experiment',
    },
  ],
}
