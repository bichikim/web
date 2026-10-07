import type {SipseongProfile} from 'k-saju'
import {getReadingTopics} from './get-reading-topics'

const CATEGORY_EXAMPLES = {
  관성: ['맡은 역할과 책임', '함께 정한 약속을 지키는 장면'],
  비겁: ['동료나 경쟁 상대와의 관계', '같은 일을 하는 사람과 의견을 나누는 장면'],
  식상: ['표현과 활동', '회의에서 생각을 말하거나 무언가를 만드는 장면'],
  인성: ['배움과 주변의 도움', '새로운 방법을 배우거나 도움을 청하는 장면'],
  재성: ['돈과 자원 관리', '예산을 정하고 필요한 곳에 돈을 쓰는 장면'],
} as const
const CATEGORY_NAMES = ['비겁', '식상', '재성', '관성', '인성'] as const

function describeCategoryPresence(object: string, count: number): string {
  return count === 0
    ? `${object} 살펴보는 분류는 이 계산에서 나타나지 않았어요.`
    : `${object} 살펴보는 분류는 이 계산에 나타났어요.`
}

/** Gives a concise calculated explanation when generation misses the answer criteria. */
export function getReadableFallback(
  question: string,
  counts: SipseongProfile['counts'],
): string | null {
  const readingTopics = getReadingTopics(question)
  const asksWealth = readingTopics.includes('wealth')
  const asksCareer = readingTopics.includes('career')
  const asksRelationship = readingTopics.includes('relationship')
  const asksPersonality = readingTopics.includes('personality')
  const topics = [
    ...(asksWealth
      ? [
          {
            example: '실제 수입과 지출',
            fact: describeCategoryPresence('돈과 자원 관리를', counts.재성),
          },
        ]
      : []),
    ...(asksCareer
      ? [
          {
            example: '현재 하는 일에서 겪는 경험',
            fact: [
              describeCategoryPresence('표현과 활동을', counts.식상),
              describeCategoryPresence('맡은 역할과 책임을', counts.관성),
            ].join(' '),
          },
        ]
      : []),
    ...(asksRelationship
      ? [{example: '상대와 나눈 대화', fact: '연애 결과나 시기를 직접 나타내는 값은 없어요.'}]
      : []),
    ...(asksPersonality
      ? [{example: '평소 행동', fact: '실제 성격을 직접 측정한 값은 없어요.'}]
      : []),
  ]

  if (topics.length > 1) {
    return [
      `질문하신 여러 주제의 실제 결과는 사주 계산만으로 단정할 수 없어요. ${topics.map(({fact}) => fact).join(' ')}`,
      `예를 들면 ${topics.map(({example}) => example).join(', ')} 같은 실제 상황을 따로 살펴볼 수 있어요. 이 계산만으로 삶의 결과를 알 수는 없어요.`,
    ].join('\n\n')
  }

  if (asksWealth && counts.재성 === 0) {
    return [
      '앞으로 돈이 잘 들어올지 이 계산만으로 단정할 수는 없어요. 돈과 자원 관리를 살펴보는 분류는 이번 계산에서 나타나지 않았어요.',
      '예를 들면 같은 사주 결과라도 수입과 지출 습관에 따라 생활 형편은 달라질 수 있어요. 이 결과가 돈을 벌 능력이 없다는 뜻은 아니에요.',
    ].join('\n\n')
  }

  if (asksCareer) {
    return [
      [
        '어떤 일이 자신에게 맞는지는 사주 계산만으로 단정할 수 없어요.',
        describeCategoryPresence('표현과 활동을', counts.식상),
        describeCategoryPresence('맡은 역할과 책임을', counts.관성),
      ].join(' '),
      '예를 들면 지금 하는 일에서 의견을 낼 기회와 맡은 역할의 부담이 실제로 어떤지 돌아볼 수 있어요. 이 결과만으로 직업 적성이나 이직 결과를 알 수는 없어요.',
    ].join('\n\n')
  }

  if (asksRelationship) {
    return [
      '연애가 어떻게 될지는 사주 계산만으로 알 수 없어요. 지금 계산한 값에는 연애 결과나 시기를 직접 나타내는 항목이 없어요.',
      '예를 들면 관심 있는 사람과 대화를 이어가는 방식이나 서로의 상황은 실제 관계 속에서 확인해야 해요. 이 계산만으로 만남의 결과를 예측할 수는 없어요.',
    ].join('\n\n')
  }

  if (!asksPersonality) {
    return null
  }

  const count = Math.max(...CATEGORY_NAMES.map((category) => counts[category]))
  const categories = CATEGORY_NAMES.filter((category) => counts[category] === count)
  const meanings = categories.map((category) => CATEGORY_EXAMPLES[category][0]).join(', ')
  const [exampleMeaning, scene] = CATEGORY_EXAMPLES[categories[0]]
  return [
    `사주 계산만으로 실제 성격을 단정할 수는 없어요. 이 계산에서 가장 자주 나온 분류는 ${meanings}에 관한 것이에요.`,
    `예를 들면 ${scene}은 그중 ${exampleMeaning}을 설명하는 장면이에요. 그런 상황에서 실제로 어떻게 행동하는지는 사주로 알 수 없어요.`,
  ].join('\n\n')
}
