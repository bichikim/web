import type {TextGenerationMessage} from 'src/features/text-generation'

const REFERENCE_OPENINGS = [
  String.raw`(?:(?:위|아래|제공된|입력된|주어진|확인한|살펴본)\s*)?`,
  String.raw`(?:내용|자료|정보|항목|계산\s*결과|분석\s*결과)(?:을|를|에)?\s*`,
  String.raw`(?:(?:참고|종합|정리)(?:해|하여)?\s*(?:보면|하면)|따르면|바탕으로(?:\s*보면)?)`,
].join('')
const OPENING_PATTERN = new RegExp(
  String.raw`^\s*(?:(?:${REFERENCE_OPENINGS}|` +
    String.raw`(?:전체적인\s*)?흐름을\s*(?:살펴보면|보면))\s*[,，:]?\s*)+`,
  'u',
)

/** Removes reference-only openings when a consultation body remains; otherwise preserves the response. */
export function formatSajuAnswer(text: string): string {
  const body = text.replace(OPENING_PATTERN, '')
  return body.trim() === '' ? text : body
}

const YEAR_REFERENCE = /(?:지난\s*해|작년|올해|내년|[0-9]{4}\s*년)/u
const CAREER_CONTEXT = /(?:시작한|입사한|들어간|옮긴|이직한)\s*(?:일|직장|회사|업무)/u
const FORTUNE_FOLLOW_UP =
  /[?？.!]\s*(?:그\s*해(?:의)?\s*)?(?:재물|금전|돈|연애)(?:운)?(?:은|는|도|이|가)?(?=$|[\s?？.!])/u
const UNSUPPORTED_ANNUAL_FORTUNE = '특정 연도의 재물운이나 연애운은 계산하지 않아요.'
const ANNUAL_LIMIT_STATEMENT =
  /(?:특정\s*연도|그\s*해|해당\s*(?:연도|해))[^.?!\n]*(?:계산할 수 없|계산하지 않|계산되지 않)/u

/** Keeps the consultation and states the calendar limit on an additional fortune question. */
export function formatGeneratedSajuAnswer(
  text: string,
  messages: ReadonlyArray<TextGenerationMessage>,
): string {
  const body = formatSajuAnswer(text)
  const question = messages.findLast(({role}) => role === 'user')?.content ?? ''
  if (
    body.trim().length === 0 ||
    !YEAR_REFERENCE.test(question) ||
    !CAREER_CONTEXT.test(question) ||
    !FORTUNE_FOLLOW_UP.test(question) ||
    ANNUAL_LIMIT_STATEMENT.test(body)
  ) {
    return body
  }
  return `${body.trimEnd()}\n\n${UNSUPPORTED_ANNUAL_FORTUNE}`
}
