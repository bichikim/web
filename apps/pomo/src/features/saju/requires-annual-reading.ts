import {getReadingTopics} from './get-reading-topics'

const RELATIVE_YEAR_PATTERN = /올해|내년|작년|금년|이번\s*해|다음\s*해|지난\s*해/u
const EXPLICIT_YEAR_PATTERN = new RegExp(
  [
    String.raw`(?:19|20|21)\d{2}\s*년`,
    String.raw`(?!생(?!활|산)|\s+생(?:의|은|는|을|과|도)?(?=$|[\s?!.:,])`,
    String.raw`|\s*\d{1,2}\s*월\s*\d{1,2}\s*일생`,
    String.raw`(?:인데(?:요)?|입니(?:다|까)|인|이라(?:서|고|면)?|이에요|이고|이지만|이야|임(?:에도)?`,
    String.raw`|의|은|는|을|과|도|으로|만|부터|처럼|에|끼리|일\s*(?:경우|수도?|지))?`,
    String.raw`(?=$|[\s?!.:,]))`,
  ].join(''),
  'u',
)
const PAST_CAREER_CONTEXT_PATTERN = new RegExp(
  [
    String.raw`(?:작년|지난\s*해|(?:19|20|21)\d{2}\s*년)`,
    String.raw`\s*(?:(?:에(?:는)?|부터)\s*)?`,
    String.raw`(?:시작한|시작했던|맡은|한|하던|다닌|다니던|근무한|근무했던|입사한|취업한)`,
    String.raw`\s*(?:일|직장|직업|업무)`,
  ].join(''),
  'u',
)
const ANNUAL_FORTUNE_PATTERN = new RegExp(
  [
    String.raw`(?:세운|운세|(?:취업|재물|직업|직장|이직|금전|연애|결혼|건강)운|(?<!\p{L})운)`,
    String.raw`(?=$|[\s?!.:,]|(?:은|는|이|가|을|를|의|에|도|만|부터|까지|로|으로|와|과|에서|에게))`,
  ].join(''),
  'u',
)

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
