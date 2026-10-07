import {
  type BirthInput,
  type DaeunInfo,
  type ElementProfile,
  type IljuInfo,
  type Saju,
  sipseongOfElement,
  type SipseongProfile,
} from 'k-saju'
import type {TextGenerationMessage} from 'src/features/text-generation'
import {getReadingTopics} from './get-reading-topics'

interface CreateMessagesInput {
  birth: BirthInput
  chart: Saju
  daeun: DaeunInfo | null
  elements: ElementProfile
  ilju: IljuInfo
  question: string
  sipseong: SipseongProfile
}

const ELEMENTS = ['木', '火', '土', '金', '水'] as const
const DAY_PILLAR_PATTERN = /일주|일간/u

const GLOSSARY = Object.fromEntries([
  ['비겁', '일간과 같은 오행. 자신과 동료·경쟁 관계를 살펴보는 전통적 분류다.'],
  ['식상', '일간이 생하는 오행. 표현·활동·생산을 살펴보는 전통적 분류다.'],
  [
    '재성',
    '일간이 제어하는 오행. 재물·자원·관리와 관련해 살펴보는 전통적 분류다. 재성의 개수는 재산이나 수입 금액이 아니다.',
  ],
  ['관성', '일간을 제어하는 오행. 규범·책임·사회적 역할을 살펴보는 전통적 분류다.'],
  ['인성', '일간을 생하는 오행. 학습·지원·보호를 살펴보는 전통적 분류다.'],
  ['일간', '일주의 천간. 십성 관계를 계산할 때 기준이 되는 글자다.'],
  ['일주', '태어난 날의 천간과 지지를 합친 두 글자다.'],
  [
    '대운',
    '생년 정보와 계산 규칙에 따라 구한 약 10년 단위의 간지 구간이다. 미래 사건의 확정적 예측이 아니다.',
  ],
  [
    '십이운성',
    '일간과 지지의 관계를 전통적으로 분류하는 단계다. 실제 생애 단계나 건강 상태를 뜻하지 않는다.',
  ],
  [
    '오행개수',
    '천간과 지지의 본기 오행을 센 값이다. 지장간을 반영한 가중 분포와 다르며, 0이 곧 해당 삶의 영역 부재를 뜻하지 않는다.',
  ],
])

const PLAIN_LANGUAGE_INSTRUCTION = [
  '사용자 답변에는 비겁·식상·재성·관성·인성·비견·겁재·일간·일주·대운·십성·오행·십이운성 같은 명리학 용어와',
  '생한다·제어한다·기운·에너지·기둥 같은 모호한 표현을 쓰지 마라. 계산 결과의 의미를 일상적인 말로 설명하라.',
].join(' ')

const SYSTEM_INSTRUCTION = [
  '당신은 한국어 사주 해석을 돕는 설명자다. 제공된 계산 결과와 용어 설명만을 근거로 답하라.',
  '십성은 일간과 다른 오행의 관계이므로 오행 하나를 모든 명식에서 같은 삶의 영역으로 고정하지 마라.',
  '사용자의 질문을 먼저 파악하고 그 주제와 직접 관련된 계산 근거만 골라 답하라. 질문하지 않은 주제로 풀이를 확장하지 마라.',
  '사주를 모르는 사람과 대화하듯 쉬운 말로 답하라. 질문에 대한 답을 첫 문장에 바로 말하라.',
  PLAIN_LANGUAGE_INSTRUCTION,
  '계산에만 쓰는 이름이므로 답변에서는 자신과 비슷한 관계, 표현과 활동, 자원 관리, 사회적 책임, 배움과 도움처럼 일상적인 말로 풀어라.',
  '질문의 의미에 도움이 되지 않는 개수나 분류 목록을 나열하지 마라. 한자, 영어, JSON 키를 답변에 쓰지 마라.',
  '십성이나 오행의 개수가 0이면 이 집계에서 해당 항목이 세어지지 않았다는 뜻이다. 해당 삶의 영역이나 능력이 없거나 부족하다고 말하지 마라.',
  '계산값과 전통적 해석을 구별하고, 한 항목의 개수만으로 성격·미래 사건을 단정하지 마라.',
  '답변에서 언급한 항목은 실제 계산값을 근거로 제시하라. 사용하지 않은 항목이 영향을 주었다고 주장하지 마라.',
  '십성 개수의 근거는 sipseong.counts, 오행 개수의 근거는 elements.counts다. ilju.twelveStage는 십이운성으로, 십성 개수와 무관하다.',
  'elements.counts는 6개 또는 8개 글자의 본기 오행 개수이고, elements.weighted는 지장간을 반영한 가중값이다. 본기 개수가 0이어도 가중값은 0이 아닐 수 있다.',
  '십성이나 오행의 최다 개수는 그 집계 안의 동률 포함 최댓값일 뿐이다. 개수만으로 강하다, 발달했다, 균형 잡혔다고 평가하지 마라.',
  '개수는 집계 사실로만 설명하라. 당신은 강하다, 능력이 좋다, 성향이 뚜렷하다 같은 단정 대신 전통적으로 어떤 관계를 살펴보는 분류인지 설명하라.',
  '특정 십성을 설명할 때는 tenGodFacts의 해당 항목과 sipseong.counts의 해당 값을 근거로 쓰고, 십이운성을 십성의 근거로 언급하지 마라.',
  '제공되지 않은 세운이나 특정 연도의 운세를 계산한 것처럼 말하지 마라.',
  '제목이나 Markdown 기호 없이 짧은 문단 2~3개, 전체 6~8문장으로 답하라.',
  '첫 문단에서 질문에 답하고 계산 근거 하나를 쉬운 말로 설명하라. 다음 문단에는 가상의 일상 장면과 알 수 없는 점을 담아라.',
  '일상 장면은 “예를 들면”으로 시작해 분류의 뜻을 이해시키는 예시로만 써라. 사용자가 실제로 겪었거나 그렇게 행동한다는 주장으로 쓰지 마라.',
  '사용자 답변에 “집계”, “항목의 개수가 없다”, “그러한 부분”처럼 딱딱하거나 모호한 표현을 쓰지 마라.',
].join('\n')
const WEALTH_GUIDANCE = [
  '재성이 0개인 명식에서 재물 질문을 받으면 재물운이나 재물 기운이 부족하다, 없다, 약하다고 말하지 마라. 재성을 재물 기운이라고 바꿔 부르지 마라.',
  '“앞으로의 재물운이 좋다 나쁘다 단정할 수는 없어요. 사주에서 돈과 관련해 살펴보는 항목이 0개로 나왔지만, 돈복이 없다는 뜻은 아니에요.”처럼 설명하라.',
].join('\n')
const PERSONALITY_GUIDANCE = [
  '성향 질문에서는 사주 계산으로 실제 성격을 단정할 수 없음을 먼저 말하라. 숫자에서 활동적, 생각이 많다, 표현력이 풍부하다 같은 성격을 추론하지 마라.',
  '계산된 분류가 어떤 관계를 살펴보는지 일상 장면으로 설명하되, 그 장면이 사용자의 실제 습관이나 취향이라고 주장하지 마라.',
].join('\n')
const DAY_PILLAR_INSTRUCTION = [
  '당신은 한국어 사주 해석을 돕는 설명자다. 제공된 계산 결과와 용어 설명만을 근거로 답하라.',
  PLAIN_LANGUAGE_INSTRUCTION,
  '사용자가 물은 일주와 일간만 설명하라. 제공되지 않은 십성 개수, 오행 분포, 대운을 언급하지 마라.',
  '태어난 날을 나타내는 두 글자와 첫 글자를 정확히 말하고, 사주를 모르는 사람도 알 수 있게 짧게 풀어라.',
  '일주 하나로 성격, 능력, 재산, 직업, 건강, 미래 사건을 단정하지 마라.',
  '제목이나 Markdown 기호 없이 짧고 자연스러운 한국어 문장으로 답하라. 필요한 경우를 제외하고 한자와 전문 용어를 나열하지 마라.',
].join('\n')

export function createMessages(input: CreateMessagesInput): TextGenerationMessage[] {
  const readingTopics = getReadingTopics(input.question)
  if (DAY_PILLAR_PATTERN.test(input.question) && readingTopics.length === 0) {
    return [
      {content: DAY_PILLAR_INSTRUCTION, role: 'system'},
      {
        content: JSON.stringify({
          birth: input.birth,
          chart: {day: input.chart.day},
          glossary: {
            십이운성: GLOSSARY.십이운성,
            일간: GLOSSARY.일간,
            일주: GLOSSARY.일주,
          },
          ilju: input.ilju,
          question: input.question,
        }),
        role: 'user',
      },
    ]
  }

  const limits = [
    ...(input.chart.hour === null
      ? ['출생 시각이 없어 시주를 계산하지 않았다. 시주에 근거한 풀이는 하지 마라.']
      : []),
    ...(input.daeun === null
      ? ['대운을 계산하지 않았다. 대운의 방향이나 시기를 추정하지 마라.']
      : []),
  ]
  const topicGuidance = [
    ...(readingTopics.includes('wealth') ? [WEALTH_GUIDANCE] : []),
    ...(readingTopics.includes('personality') ? [PERSONALITY_GUIDANCE] : []),
  ]
  const tenGodFacts = ELEMENTS.map((element) => {
    const category = sipseongOfElement(input.chart.day.stem, element)
    return {category, count: category === null ? null : input.sipseong.counts[category], element}
  })
  const tenGodsByElement = Object.fromEntries(
    tenGodFacts.map(({category, element}) => [element, category]),
  )

  return [
    {content: [SYSTEM_INSTRUCTION, ...limits, ...topicGuidance].join('\n'), role: 'system'},
    {
      content: JSON.stringify({
        birth: input.birth,
        chart: input.chart,
        daeun: input.daeun,
        elements: {counts: input.elements.counts, weighted: input.elements.weighted},
        glossary: GLOSSARY,
        ilju: input.ilju,
        question: input.question,
        sipseong: {counts: input.sipseong.counts, dayMaster: input.sipseong.dayMaster},
        tenGodFacts,
        tenGodsByElement,
      }),
      role: 'user',
    },
  ]
}
