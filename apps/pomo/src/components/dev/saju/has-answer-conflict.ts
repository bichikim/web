import type {SajuAnswerFacts} from './messages'

const YEAR_PATTERN = /(?<!\d)(?:19|20|21)\d{2}(?!\d)/gu
const UNVERIFIED_COUNT_PATTERN = /(?:\d+|한|두|세|네|다섯|여섯|일곱|여덟)\s*개/u
const TECHNICAL_TERMS = [
  '비비겁',
  '비겁',
  '식상',
  '재성',
  '관성',
  '인성',
  '비견',
  '겁재',
  '일간',
  '일주',
  '대운',
  '십성',
  '오행',
  '십이운성',
  '천간',
  '지지',
  '간지',
  '시주',
]
const TECHNICAL_TERM_PATTERN = new RegExp(
  `(?:^|[^가-힣])(?:${TECHNICAL_TERMS.join('|')})(?=$|[^가-힣]|[은는이가을를의과와도만에로])`,
  'u',
)
const VAGUE_LANGUAGE_PATTERN = /생하(?:는|다)|제어하(?:는|다)|기운|에너지|기둥/u
const UNSUPPORTED_STRENGTH_PATTERN = /발달|강하|강한|뚜렷|능력이\s*좋|균형\s*(?:있|잡)/u
const UNSUPPORTED_WEALTH_ABSENCE_PATTERN =
  /(?:재물|금전|돈).{0,18}(?:기운|운|복)(?:이|은|는)?\s*(?:없(?:습니다|어요)|부족(?:합니다|해요)|약합니다)/u
const UNSUPPORTED_WEALTH_SCOPE_PATTERN = /(?:재물|금전|돈).{0,32}살펴볼 만한 부분이 없습니다/u

/** Detects generated claims that exceed or contradict the calculated facts. */
export function hasAnswerConflict(answer: string, facts: SajuAnswerFacts): boolean {
  const years = [...answer.matchAll(YEAR_PATTERN)]

  return (
    years.some(([year]) => Number(year) !== facts.birthYear) ||
    UNVERIFIED_COUNT_PATTERN.test(answer) ||
    TECHNICAL_TERM_PATTERN.test(answer) ||
    VAGUE_LANGUAGE_PATTERN.test(answer) ||
    UNSUPPORTED_STRENGTH_PATTERN.test(answer) ||
    UNSUPPORTED_WEALTH_ABSENCE_PATTERN.test(answer) ||
    UNSUPPORTED_WEALTH_SCOPE_PATTERN.test(answer)
  )
}
