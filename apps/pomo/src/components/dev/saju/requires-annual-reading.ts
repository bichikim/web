import {getReadingTopics} from './get-reading-topics'

const RELATIVE_YEAR_PATTERN = /올해|내년|작년|금년|이번\s*해|다음\s*해|지난\s*해/u
const EXPLICIT_YEAR_PATTERN = /(?:19|20|21)\d{2}\s*년(?!생)/u
const PAST_CAREER_CONTEXT_PATTERN = new RegExp(
  [
    String.raw`(?:작년|지난\s*해|(?:19|20|21)\d{2}\s*년)`,
    String.raw`\s*(?:(?:에(?:는)?|부터)\s*)?`,
    String.raw`(?:시작한|시작했던|맡은|한|하던|다닌|다니던|근무한|근무했던|입사한|취업한)`,
    String.raw`\s*(?:일|직장|직업|업무)`,
  ].join(''),
  'u',
)
const ANNUAL_FORTUNE_PATTERN = /[\p{L}]*운(?:세)?(?=$|[\s?!.:,은이을의가도만부터는로와과])/u

/** Identifies questions that require annual fortune data this experiment does not calculate. */
export function requiresAnnualReading(question: string): boolean {
  const containsYearReference =
    RELATIVE_YEAR_PATTERN.test(question) || EXPLICIT_YEAR_PATTERN.test(question)
  if (!containsYearReference) {
    return false
  }

  const pastCareerContext = PAST_CAREER_CONTEXT_PATTERN.exec(question)?.[0]
  const isCareerContext = getReadingTopics(question).includes('career')
  if (!pastCareerContext || !isCareerContext || ANNUAL_FORTUNE_PATTERN.test(question)) {
    return true
  }

  const remainingQuestion = question.replace(pastCareerContext, '')
  return (
    RELATIVE_YEAR_PATTERN.test(remainingQuestion) || EXPLICIT_YEAR_PATTERN.test(remainingQuestion)
  )
}
