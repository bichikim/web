const RELATIVE_YEAR_PATTERN = /올해|내년|작년|금년|이번\s*해|다음\s*해|지난\s*해/u
const EXPLICIT_YEAR_PATTERN = /(?:19|20|21)\d{2}\s*년(?!생)/u

/** Identifies questions that require annual fortune data this experiment does not calculate. */
export function requiresAnnualReading(question: string): boolean {
  return RELATIVE_YEAR_PATTERN.test(question) || EXPLICIT_YEAR_PATTERN.test(question)
}
