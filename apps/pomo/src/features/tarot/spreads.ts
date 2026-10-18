import {TAROT_DRAW_COUNTS, type TarotDrawCount, type TarotLocale} from './cards'

export interface TarotSpreadPosition {
  readonly meaning: Readonly<Record<TarotLocale, string>>
  readonly name: Readonly<Record<TarotLocale, string>>
}

const SPREAD_POSITIONS: Readonly<Record<TarotDrawCount, ReadonlyArray<TarotSpreadPosition>>> = {
  1: [],
  3: [
    {
      meaning: {
        en: 'Past experiences influencing the question.',
        ko: '질문에 영향을 주는 이전 경험과 배경.',
      },
      name: {en: 'Past', ko: '과거'},
    },
    {
      meaning: {en: 'The current state of the situation.', ko: '지금 마주한 상황과 마음의 상태.'},
      name: {en: 'Present', ko: '현재'},
    },
    {
      meaning: {
        en: 'A possible direction ahead, not a certain prediction.',
        ko: '앞으로 이어질 수 있는 가능성으로, 확정적인 예언이 아님.',
      },
      name: {en: 'Future', ko: '미래'},
    },
  ],
  5: [
    {
      meaning: {
        en: 'What is happening now at the heart of the question.',
        ko: '질문과 관련해 지금 일어나고 있는 핵심 상황.',
      },
      name: {en: 'Current situation', ko: '현재 상황'},
    },
    {
      meaning: {
        en: 'What is holding progress back, including inner hesitation or external constraints.',
        ko: '진행을 막는 내면의 망설임이나 외부의 제약.',
      },
      name: {en: 'Obstacle', ko: '막히는 점'},
    },
    {
      meaning: {
        en: 'Available strengths, resources, or supportive influences.',
        ko: '활용할 수 있는 강점, 자원, 주변의 도움.',
      },
      name: {en: 'Support', ko: '도움이 되는 점'},
    },
    {
      meaning: {
        en: 'A helpful attitude or practical next step to consider.',
        ko: '지금 고려할 만한 태도나 구체적인 다음 행동.',
      },
      name: {en: 'Advice', ko: '조언'},
    },
    {
      meaning: {
        en: 'A possible outcome if this pattern continues, which can change with choices.',
        ko: '현재 흐름이 이어질 때의 가능성으로, 선택에 따라 달라질 수 있음.',
      },
      name: {en: 'Possible outcome', ko: '예상 흐름'},
    },
  ],
}

/** Returns ordered reading positions for a supported draw count. */
export const getTarotSpread = (count: number): ReadonlyArray<TarotSpreadPosition> => {
  switch (count) {
    case TAROT_DRAW_COUNTS.one:
    case TAROT_DRAW_COUNTS.three:
    case TAROT_DRAW_COUNTS.five:
      return SPREAD_POSITIONS[count]
    default:
      throw new Error('Tarot reading requires one, three, or five cards')
  }
}
