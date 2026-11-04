import {
  type DaeunInfo,
  type Element,
  type ElementProfile,
  type Saju,
  sipseongOfElement,
  type SipseongProfile,
} from 'k-saju'
import type {TextGenerationMessage} from 'src/features/text-generation'
import {getReadingTopics} from './get-reading-topics'

interface CreateMessagesInput {
  chart: Saju
  daeun: DaeunInfo | null
  elements: ElementProfile
  question: string
  sipseong: SipseongProfile
}

const ELEMENTS = ['木', '火', '土', '金', '水'] as const
const DAY_PILLAR_PATTERN = /일주|일간/u
const SUBJECTS = {
  관성: '약속과 책임',
  비겁: '협력과 조율',
  식상: '표현과 창작',
  인성: '배움과 도움',
  재성: '돈과 시간 관리',
} satisfies Record<keyof SipseongProfile['counts'], string>

const LANGUAGE_INSTRUCTION = [
  '사주를 처음 듣는 사람과 마주 앉아 상담하듯 쉬운 한국어와 자연스러운 존댓말로 답하라. 실제로 소리 내어 말할 수 있는 짧고 구체적인 문장을 써라.',
  '질문에 맞는 구체적인 해석부터 시작하라. 질문을 되풀이하거나 고정된 도입을 붙이지 말고, 문단의 시작과 문장 구조도 자연스럽게 바꿔라.',
  '전문 용어, 한자, 내부 수치, 등급, 단계 순번, 나타난 횟수와 개수를 설명하지 마라. 사용자가 이름 자체를 직접 물었을 때만 요청한 이름과 글자를 밝히고 쉽게 설명하라.',
  '사주에서 읽은 특징은 자연스럽게 밝혀도 된다. 위나 아래 자료, 입력 정보, 프롬프트 등 사용자가 볼 수 없는 기록을 소개하지 마라.',
  '돈, 일, 대화, 관계처럼 구체적인 행동으로 풀어라. 낯선 분류 이름을 괄호로 풀이하거나 뜻이 불분명한 비유와 외국어로 설명하지 마라.',
  '제목, 번호, 목록, 굵은 글씨 없이 자연스러운 문단으로 답하라. 문단 사이에는 빈 줄을 넣어라.',
].join('\n')

const SYSTEM_INSTRUCTION = [
  LANGUAGE_INSTRUCTION,
  '출생 정보를 전통적인 방법으로 분류한 단서로 사주를 풀이하라. prominent가 참인 주제가 두드러진 특징이다. 그 외 주제가 약하다거나 다른 주제가 더 강하다는 등급을 새로 만들지 마라.',
  '질문과 관련된 특징 두세 가지에 집중하라. 사주에서 읽은 특징, 그 특징이 생활에서 드러나는 모습, 그래서 잘 맞는 선택과 주의할 점을 연결하라. 일반적인 조언만 나열하지 마라.',
  '특징을 나타난 횟수나 수준으로 설명하지 말고 어떤 성향으로 읽히는지 풀어라. 주제 이름을 그대로 인용하지 말고 질문에 맞게 해석하라.',
  '강점과 잘 맞는 방식은 자신 있게 말하라. 모든 말을 가능성으로 흐리지 마라. 주의점은 사람의 인격을 평가하는 대신 부담이 생기는 상황과 대처 방법으로 설명하라.',
  '관찰되지 않은 주제는 실제 능력을 평가할 근거가 아니다. 사주 단서로 사용자의 실제 경험이나 다른 사람의 속마음을 지어내거나 미래 사건의 결과를 보장하지 마라.',
  '현재 날짜와 현재에 해당하는 장기 구간, 특정 연도의 운세는 제공되지 않는다. 지금의 구간이나 앞으로 사건이 일어날 시기를 추측하지 마라.',
  '근거가 충분하면 4~6개 문단, 12~18문장으로 충분히 설명하라. 근거가 제한적이면 3~5개 문단, 8~12문장 안에서 확인되는 범위만 설명하라.',
  '같은 뜻을 바꾸어 쓰며 분량을 채우지 마라. 질문에 답하는 데 필요한 한계만 짧게 밝히고 상담을 시작하거나 끝낼 때마다 면책 문장을 붙이지 마라.',
].join('\n')

const READING_REQUEST = [
  '왜 그런 풀이가 나왔는지 사주에서 읽은 특징을 자연스럽게 밝히고, 그 특징과 이유가 이어지는 상담을 해 주세요. 특징마다 한 문단씩 소개하지 말고 두세 가지를 충분히 풀어 주세요.',
  '특징을 수준이나 횟수로 평가하지 말고 생활에서 어떤 모습으로 드러나는지 이야기해 주세요. 강점은 분명하게, 주의점은 상황과 대처 방법으로 말해 주세요.',
  '최종 풀이만 자연스러운 존댓말로 전달해 주세요. 사용자의 걱정을 사실로 받아들이거나 미래의 결말을 확정하지 마세요.',
].join('\n')

function createConsultationContext(input: CreateMessagesInput) {
  const weights = Object.values(input.elements.weighted)
  const minimum = Math.min(...weights)
  const maximum = Math.max(...weights)
  const describeElements = (elements: ReadonlyArray<Element>) =>
    elements.flatMap((element) => {
      const category = sipseongOfElement(input.chart.day.stem, element)
      return category === null ? [] : [SUBJECTS[category]]
    })
  return {
    ...(input.question.includes('대운')
      ? {
          daeun:
            input.daeun === null
              ? null
              : {
                  periods: input.daeun.pillars.map((period) => ({
                    subjects: describeElements([period.stemElement, period.branchElement]),
                  })),
                },
        }
      : {}),
    question: input.question,
    themes: ELEMENTS.flatMap((element) => {
      const category = sipseongOfElement(input.chart.day.stem, element)
      return category === null
        ? []
        : [
            {
              observed: input.sipseong.counts[category] > 0,
              prominent: minimum !== maximum && input.elements.weighted[element] === maximum,
              subject: SUBJECTS[category],
            },
          ]
    }),
  }
}

/** Builds a consultation from readable calculation facts, keeping requested day names exact. */
export function createMessages(input: CreateMessagesInput): TextGenerationMessage[] {
  const readingTopics = getReadingTopics(input.question)
  if (DAY_PILLAR_PATTERN.test(input.question) && readingTopics.length === 0) {
    return [
      {
        content: [
          LANGUAGE_INSTRUCTION,
          '사용자가 물은 일주와 일간만 짧게 설명하라. 태어난 날의 두 글자와 그중 첫 글자를 구분하고, 이 이름으로 성격이나 미래를 단정하지 마라.',
        ].join('\n'),
        role: 'system',
      },
      {
        content: JSON.stringify({
          chart: {day: input.chart.day},
          question: input.question,
        }),
        role: 'user',
      },
    ]
  }

  const limits = [
    ...(input.chart.hour === null
      ? ['출생 시각은 알 수 없다. 시각에 근거한 풀이는 하지 마라.']
      : []),
    ...(input.daeun === null
      ? ['장기 구간을 계산하지 않았다. 장기 구간의 방향과 시기를 추정하지 마라.']
      : []),
    ...(readingTopics.includes('wealth') && input.sipseong.counts.재성 === 0
      ? [
          '돈과 관련된 단서가 관찰되지 않아도 돈복이 없거나 다른 활동으로 돈을 벌어야 한다는 뜻은 아니다. 이 사실만으로 실제 재산과 수입, 돈을 버는 방식과 성향을 추측하지 마라.',
        ]
      : []),
    ...(readingTopics.includes('personality')
      ? [
          '성향은 사주에서 읽는 특징으로 설명하라. 강점과 주의할 점을 구체적인 생활 장면에 연결하되 사용자의 실제 습관이나 과거 경험을 지어내지 마라.',
        ]
      : []),
  ]

  return [
    {content: [SYSTEM_INSTRUCTION, ...limits].join('\n'), role: 'system'},
    {
      content: [
        JSON.stringify(createConsultationContext(input)),
        [`상담할 질문: ${input.question}`, READING_REQUEST].join('\n'),
      ].join('\n\n'),
      role: 'user',
    },
  ]
}
