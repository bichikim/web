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
  ['비겁', '비슷한 입장의 사람들과 협력하거나 경쟁하는 주제를 살펴볼 때 쓰는 분류다.'],
  ['식상', '말·행동·창작처럼 밖으로 표현하고 만들어 내는 일을 살펴볼 때 쓰는 분류다.'],
  [
    '재성',
    '재물과 자원을 다루는 주제를 살펴볼 때 쓰는 분류다. 개수는 실제 재산·수입·돈복을 뜻하지 않는다.',
  ],
  ['관성', '맡은 일의 책임과 사회적 역할을 살펴볼 때 쓰는 분류다.'],
  ['인성', '배움과 도움을 주고받는 주제를 살펴볼 때 쓰는 분류다.'],
  ['일간', '태어난 날을 적은 두 글자 중 첫 글자로, 계산의 기준이 된다.'],
  ['일주', '태어난 날을 적은 두 글자다.'],
  [
    '대운',
    '태어난 정보를 바탕으로 계산한 약 10년 단위 구간이다. 실제로 일어날 사건을 알려주지는 않는다.',
  ],
  [
    '십이운성',
    '태어난 날을 기준으로 살펴보는 전통적인 분류 단계다. 실제 나이나 건강 상태를 뜻하지 않는다.',
  ],
  [
    '오행개수',
    '태어난 정보를 다섯 종류로 나눠 센 값이다. 0이어도 관련된 삶의 영역이 없다는 뜻은 아니다.',
  ],
])

const PLAIN_LANGUAGE_INSTRUCTION = [
  '사용자 답변에서는 계산 자료의 분류명이나 계산 관계를 설명하지 마라.',
  '사용자가 묻지 않은 용어 풀이를 덧붙이지 마라. 계산 자료의 설명 문장을 옮겨 적거나 용어를 주어로 삼지 마라.',
  '질문에 맞는 생활 언어로 다시 쓰고, 추상적인 비유나 분류 이름 대신 돈·일·관계처럼 사용자가 물은 대상을 직접 말하라.',
  '사용자가 특정 용어나 자신의 일주·일간을 직접 물으면 그 요청한 이름과 값만 짧게 밝힐 수 있다.',
  '최종 답변에 기운·에너지·집계·항목 같은 단어가 남았다면 평범한 말로 고쳐 쓴 뒤 결과만 출력하라.',
].join(' ')

const SYSTEM_INSTRUCTION = [
  '당신은 한국어 사주 해석을 돕는 설명자다. 제공된 계산 결과와 자료의 의미만을 근거로 답하라.',
  '금·목·수·화·토 중 한 종류를 모든 사람에게 같은 삶의 영역으로 고정하지 마라. chart.day.stem과 tenGodFacts에 따른 분류를 사용하라.',
  '사용자의 질문을 먼저 파악하고 그 주제와 직접 관련된 계산 근거만 골라 답하라. 질문하지 않은 주제로 풀이를 확장하지 마라.',
  '질문과 직접 관련된 근거가 부족하면 짧게 그 한계를 말하고 끝내라. 다른 분류를 끌어와 답변 분량을 채우지 마라.',
  '사주를 모르는 사람과 대화하듯 쉬운 말로 답하라. 질문에 대한 답을 첫 문장에 바로 말하라.',
  '답변은 질문에 맞는 생활 속 주제로 구성하라. 계산 분류를 하나씩 소개하거나 정의하는 형식으로 쓰지 마라.',
  '사용자가 수치나 계산법을 직접 묻지 않았다면 개수나 분류 목록을 나열하지 마라. 한자, 영어, JSON 키를 답변에 쓰지 마라.',
  '계산 표에서 0으로 표시된 주제가 있어도 삶의 그 부분이나 능력이 없거나 부족하다고 말하지 마라.',
  '계산값과 전통적 해석을 구별하고, 한 항목의 개수만으로 성격·미래 사건을 단정하지 마라.',
  '답변에서 언급한 항목은 실제 계산값을 근거로 제시하라. 사용하지 않은 항목이 영향을 주었다고 주장하지 마라.',
  'sipseong.counts와 elements.counts는 서로 다른 기준으로 센 값이다. ilju.twelveStage를 두 값의 근거로 삼지 마라.',
  'elements.counts와 elements.weighted도 기준이 다르다. 한쪽 값이 0이어도 다른 쪽은 0이 아닐 수 있다.',
  'counts의 가장 큰 값도 그 표에서 가장 많이 세어진 값일 뿐이다. 개수만으로 강하다, 발달했다, 균형 잡혔다고 평가하지 마라.',
  '개수를 설명할 때도 당신은 강하다, 능력이 좋다, 성향이 뚜렷하다 같은 결론으로 연결하지 마라.',
  '어떤 주제든 tenGodFacts와 sipseong.counts의 해당 값을 근거로 쓰고, ilju.twelveStage를 그 값의 근거로 삼지 마라.',
  '제공되지 않은 세운이나 특정 연도의 운세를 계산한 것처럼 말하지 마라.',
  '답할 근거가 충분할 때만 제목이나 Markdown 기호 없이 짧은 문단 2~3개, 전체 6~8문장으로 답하라. 근거가 부족하면 2~3문장으로 답하라.',
  '첫 문단에서 질문에 답하고 관련된 계산 근거를 일상의 말로 풀어라. 다음 문단에는 가상의 일상 장면과 알 수 없는 점을 담아라.',
  '일상 장면은 “예를 들면”으로 시작하는 예시로만 써라. 사용자가 실제로 겪었거나 그렇게 행동한다는 주장으로 쓰지 마라.',
  '사용자 답변에 “집계”, “항목의 개수가 없다”, “그러한 부분”처럼 딱딱하거나 모호한 표현을 쓰지 마라.',
].join('\n')
const WEALTH_ZERO_GUIDANCE = [
  '재성이 0개인 명식에서 재물 질문을 받았다. 다른 분류로 돈을 버는 방식이나 성향을 추측하지 마라.',
  '최종 답변은 다음 두 문장만 사용하라: “이 사주만으로 돈을 얼마나 벌거나 모을지 알 수 없어요. 돈과 관련된 값이 적게 보인다는 이유만으로 돈복이 없다고 볼 수도 없어요.”',
].join('\n')
const PERSONALITY_GUIDANCE = [
  '성향 질문에서는 사주 계산으로 실제 성격을 단정할 수 없음을 먼저 말하라. 숫자에서 활동적, 생각이 많다, 표현력이 풍부하다 같은 성격을 추론하지 마라.',
  '관련된 주제를 일상 장면으로 설명하되, 그 장면이 사용자의 실제 습관이나 취향이라고 주장하지 마라.',
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
    ...(readingTopics.includes('wealth') && input.sipseong.counts.재성 === 0
      ? [WEALTH_ZERO_GUIDANCE]
      : []),
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
    {
      content: [SYSTEM_INSTRUCTION, ...limits, ...topicGuidance, PLAIN_LANGUAGE_INSTRUCTION].join(
        '\n',
      ),
      role: 'system',
    },
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
