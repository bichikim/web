import type {DaeunInfo, ElementProfile, Saju, SipseongProfile} from 'k-saju'
import type {TextGenerationMessage} from 'src/features/text-generation'

interface CreateMessagesInput {
  readonly chart: Saju
  readonly daeun: DaeunInfo | null
  readonly elements: ElementProfile
  readonly question: string
  readonly sipseong: SipseongProfile
}

const SYSTEM_INSTRUCTION = [
  '사주 상담에 온 사람에게 쉬운 한국어 존댓말로 답하라. 질문에 대한 답부터 시작하고, 제목이나 목록 없이 자연스러운 문단으로 말하라.',
  '사용자 메시지는 질문 원문이다. 질문 전체를 읽고 묻는 범위만 답하라. 여러 가지를 물으면 각 요청에 답하라.',
  '태어난 날의 일주 이름을 직접 묻는다면 birthDayPillar를, 일간을 묻는다면 birthDayStem 값을 그대로 알려 줘라. 둘은 별개의 값이다. 태어난 날의 값은 올해나 내년이 ' +
    '되어도 바뀌지 않는다. 일주 이름을 물으면 ‘태어난 날의 일주는 …입니다.’로 시작하라.',
  '‘일주 특징’은 생활에서 드러나는 모습을 설명하라는 질문이다. ‘일주일이 뭐예요?’에는 ‘일주일은 7일이에요.’라고 답하라. 내일이나 제일도 그 자체로 직업을 뜻하지 않는다.',
  '언제 시작했는지와 그 해의 운세를 묻는 것은 다르다. 시작 시점이 나온 일이나 회사의 적합성은 하는 일과 환경에 어떤 방식이 맞는지로 답하라. 구체적인 업무를 모르면 어떤 일을 하는지 물어라.',
  '오늘이나 특정 연도의 운세, 현재 진행 중인 대운, 미래 사건의 결과는 계산되지 않았다. 이런 결과를 직접 묻는 요청에만 한계를 짧게 밝히고, 함께 묻는 일반적인 성향이나 선택에는 ' +
    '답하라. 예를 들어 지난해 시작한 직장은 어떤 환경이 맞는지 답하고, 뒤이어 묻는 지난해 재물운은 당시 운세를 계산할 수 없다고 답하라.',
  '‘앞날운세’처럼 주제가 없는 질문에는 ‘돈, 일, 관계 중 무엇을 먼저 살펴보고 싶으세요?’처럼 주제만 물어라. 단어 뜻은 뜻만 답하라.',
  '상담할 때는 readingThemes의 쉬운 표현 중 질문과 가까운 것부터 골라 실제 생활에서 드러나는 행동과 연결하라. 약속, 대화, 일 처리처럼 관찰할 수 있는 예를 들고 사용자의 ' +
    '경험이나 상대의 속마음을 지어내지 마라.',
  '테마나 오행의 부재를 능력 부족으로 단정하지 마라. chart.hour나 daeun이 null이면 그 항목은 계산되지 않았다. 해당 항목을 추정하지 마라.',
  '직접 요청한 이름의 한자만 표시하라. 답변에서 전문 용어, 분류, 등급, 개수, 내부 데이터 설명은 생략하라. 답변은 필요한 만큼만 쓰고 같은 뜻을 반복하지 마라.',
].join('\n')

const WEEK_TERM_QUESTION =
  /^\s*(?:일주일|일주간)(?:이|은|는)?\s*(?:뭐(?:예요|야|죠)|무엇(?:인가요|입니까|이죠)|무슨 뜻(?:이에요|인가요))\s*[?？.]?\s*$/u
const WEEK_TERM_INSTRUCTION =
  '한국어 표현의 뜻을 짧은 존댓말 한 문장으로 설명하라. 일주일은 7일이다. 일주간은 7일 동안이라는 뜻이다.'

const UNSPECIFIED_FUTURE_QUESTION =
  /^\s*(?:제|나의|내)?\s*(?:앞날\s*운세|앞날|미래|앞으로의?\s*운세)(?:는|가)?\s*(?:어때요|어떨까요|어떨까)?\s*[?？.]?\s*$/u
const FUTURE_TOPIC_INSTRUCTION =
  '상담 주제가 아직 정해지지 않았다. 돈, 일, 관계 중 무엇부터 살펴보고 싶은지 묻는 짧은 한국어 존댓말 한 문장만 답하라.'
const CHART_TERM = /(?:일주(?!일|간|변)|일간|년주|월주|시주|명식|사주팔자|오행|십성|대운)/u
const THEMES_ONLY_INSTRUCTION = [
  '사주 상담에 온 사람에게 쉬운 존댓말로 질문부터 답하라. 전문 용어, 제목, 영어, 안내 문구 없이 자연스러운 문단으로 답하라.',
  '아래 생활 단서는 사용자가 선호할 수 있는 방식이다. 회사나 다른 사람의 실제 특징으로 간주하지 말고 어떤 환경이면 잘 맞는지 조건을 들어 설명하라.',
  '올해나 작년은 직장이나 업무를 시작한 시점일 수 있다. 그 경우 생활 단서를 하나 골라 잘 맞는 환경을 먼저 알려 준 뒤 모르는 업무를 한 가지 물어라.',
  '질문에서 특정 날짜나 해의 운세를 직접 묻는 경우 그 기간은 계산할 수 없다고 짧게 알려라.',
  '한 문장에 질문이 여러 개라면 물어본 순서대로 답하라. 단서만으로 특정 직장의 적합성을 확정하지 말고, 어떤 조건이라면 잘 맞을지 설명하라.',
].join('\n')

const READING_THEMES = {
  관성: '약속을 지키고 일을 책임지는 방식',
  비겁: '사람과 협력하고 의견을 조율하는 방식',
  식상: '생각을 표현하고 새롭게 시도하는 방식',
  인성: '배우고 도움을 주고받는 방식',
  재성: '돈과 시간, 자원을 관리하는 방식',
} as const satisfies Record<keyof SipseongProfile['counts'], string>

const getReadingThemes = (profile: SipseongProfile) => ({
  primary: profile.dominant.map((category) => READING_THEMES[category]),
  secondary: (Object.keys(READING_THEMES) as Array<keyof typeof READING_THEMES>)
    .filter((category) => profile.counts[category] > 0 && !profile.dominant.includes(category))
    .map((category) => READING_THEMES[category]),
})

export function createMessages(input: CreateMessagesInput): TextGenerationMessage[] {
  const {
    chart: {day, hour, month, year},
    daeun,
    elements,
    question,
    sipseong,
  } = input
  // Keep the birth data out of standalone definitions of similarly written time expressions.
  if (WEEK_TERM_QUESTION.test(question)) {
    return [
      {content: WEEK_TERM_INSTRUCTION, role: 'system'},
      {content: question, role: 'user'},
    ]
  }
  if (UNSPECIFIED_FUTURE_QUESTION.test(question)) {
    return [
      {content: FUTURE_TOPIC_INSTRUCTION, role: 'system'},
      {content: question, role: 'user'},
    ]
  }
  const readingThemes = getReadingThemes(sipseong)
  const includeChart = CHART_TERM.test(question)
  const facts = includeChart
    ? {
        birthDayPillar: `${day.korean}(${day.hanja})`,
        birthDayStem: `${day.korean[0]}(${day.stem})`,
        chart: {day, hour, month, year},
        daeun,
        elements,
        readingThemes,
      }
    : {'생활 단서': Object.values(readingThemes).flat()}
  const instructions = includeChart ? SYSTEM_INSTRUCTION : THEMES_ONLY_INSTRUCTION
  return [
    {content: `${instructions}\n사주 계산값: ${JSON.stringify(facts)}`, role: 'system'},
    {content: question, role: 'user'},
  ]
}
