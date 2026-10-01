import {RANK_CONTEXT, SUIT_CONTEXT} from './meaning-context'
import {REVERSED_MEANINGS} from './reversed-meanings'

export type TarotLocale = 'en' | 'ko'
const UPRIGHT_PROBABILITY = 0.5
export const TAROT_DRAW_COUNTS = {five: 5, one: 1, three: 3} as const
export type TarotDrawCount = (typeof TAROT_DRAW_COUNTS)[keyof typeof TAROT_DRAW_COUNTS]
export type TarotOrientation = 'upright' | 'reversed'
export type TarotSuit = 'cups' | 'pentacles' | 'swords' | 'wands'

export interface TarotCard {
  readonly arcana: 'major' | 'minor'
  readonly id: string
  readonly meaning: Readonly<Record<TarotLocale, string>>
  readonly name: Readonly<Record<TarotLocale, string>>
  readonly reversedMeaning: Readonly<Record<TarotLocale, string>>
  readonly suit?: TarotSuit
}

export interface DrawnTarotCard extends TarotCard {
  readonly orientation: TarotOrientation
}

type MajorRow = readonly [
  id: string,
  english: string,
  korean: string,
  meaningEn: string,
  meaningKo: string,
]
type MinorRow = readonly [rank: TarotRank, meaningEn: string, meaningKo: string]

const MAJOR_ROWS = [
  [
    'fool',
    'The Fool',
    '광대',
    'An open beginning and willingness to explore',
    '열린 시작과 새로운 경험을 향한 마음',
  ],
  [
    'magician',
    'The Magician',
    '마법사',
    'Turning available skills into action',
    '가진 능력을 실제 행동으로 옮기기',
  ],
  [
    'high-priestess',
    'The High Priestess',
    '여사제',
    'Listening to quiet intuition and hidden context',
    '직관과 드러나지 않은 맥락 살피기',
  ],
  [
    'empress',
    'The Empress',
    '여황제',
    'Care, growth, and creative abundance',
    '돌봄과 성장, 창조적인 풍요',
  ],
  [
    'emperor',
    'The Emperor',
    '황제',
    'Structure, boundaries, and steady leadership',
    '구조와 경계, 안정적인 주도성',
  ],
  [
    'hierophant',
    'The Hierophant',
    '교황',
    'Learning from tradition and shared values',
    '전통과 공동의 가치에서 배우기',
  ],
  [
    'lovers',
    'The Lovers',
    '연인',
    'Choosing in line with close relationships and values',
    '관계와 가치에 맞는 선택',
  ],
  [
    'chariot',
    'The Chariot',
    '전차',
    'Focused direction through competing pressures',
    '엇갈린 힘 속에서도 방향을 잡기',
  ],
  [
    'strength',
    'Strength',
    '힘',
    'Patient courage and gentle self-control',
    '인내하는 용기와 부드러운 절제',
  ],
  [
    'hermit',
    'The Hermit',
    '은둔자',
    'Stepping back to seek inner clarity',
    '한걸음 물러나 내면의 답 찾기',
  ],
  [
    'wheel-of-fortune',
    'Wheel of Fortune',
    '운명의 수레바퀴',
    'A turning point and changing circumstances',
    '전환점과 바뀌는 상황',
  ],
  [
    'justice',
    'Justice',
    '정의',
    'Fair judgment and responsibility for choices',
    '공정한 판단과 선택의 책임',
  ],
  [
    'hanged-man',
    'The Hanged Man',
    '매달린 사람',
    'Pausing to see a different perspective',
    '잠시 멈추고 다른 관점 보기',
  ],
  ['death', 'Death', '죽음', 'An ending that makes room for change', '변화를 위한 마무리'],
  [
    'temperance',
    'Temperance',
    '절제',
    'Finding a workable balance and pace',
    '균형과 알맞은 속도 찾기',
  ],
  [
    'devil',
    'The Devil',
    '악마',
    'Noticing attachments that limit choice',
    '선택을 좁히는 집착 알아차리기',
  ],
  [
    'tower',
    'The Tower',
    '탑',
    'Disruption that exposes what needs rebuilding',
    '다시 세워야 할 것을 드러내는 변화',
  ],
  ['star', 'The Star', '별', 'Renewed hope and room to recover', '희망을 되찾고 회복할 여지'],
  [
    'moon',
    'The Moon',
    '달',
    'Uncertainty, dreams, and unclear signals',
    '불확실함과 꿈, 흐릿한 단서',
  ],
  ['sun', 'The Sun', '태양', 'Clarity, vitality, and shared joy', '명료함과 활력, 함께하는 기쁨'],
  [
    'judgement',
    'Judgement',
    '심판',
    'Reviewing the past before a fresh decision',
    '지난 일을 돌아보고 새로 판단하기',
  ],
  [
    'world',
    'The World',
    '세계',
    'Completion and a wider sense of connection',
    '완성과 더 넓은 연결감',
  ],
] as const satisfies ReadonlyArray<MajorRow>

const RANKS = {
  ace: {en: 'Ace', ko: '에이스'},
  eight: {en: 'Eight', ko: '8'},
  five: {en: 'Five', ko: '5'},
  four: {en: 'Four', ko: '4'},
  king: {en: 'King', ko: '왕'},
  knight: {en: 'Knight', ko: '기사'},
  nine: {en: 'Nine', ko: '9'},
  page: {en: 'Page', ko: '시종'},
  queen: {en: 'Queen', ko: '여왕'},
  seven: {en: 'Seven', ko: '7'},
  six: {en: 'Six', ko: '6'},
  ten: {en: 'Ten', ko: '10'},
  three: {en: 'Three', ko: '3'},
  two: {en: 'Two', ko: '2'},
} as const
type TarotRank = keyof typeof RANKS

const SUITS = [
  {
    cards: [
      ['ace', 'A fresh spark of initiative', '새로운 의욕의 불씨'],
      ['two', 'Considering the next direction', '다음 방향을 가늠하기'],
      ['three', 'Early progress beyond a plan', '계획 밖으로 넓어지는 첫 성과'],
      ['four', 'A moment to celebrate together', '함께 성취를 기념할 순간'],
      ['five', 'Competing ideas and lively friction', '서로 다른 생각이 부딪히는 과정'],
      ['six', 'Recognition for visible effort', '드러난 노력에 대한 인정'],
      ['seven', 'Holding a position under pressure', '압박 속에서도 입장 지키기'],
      ['eight', 'Momentum and fast-moving news', '속도 붙는 일과 빠른 소식'],
      ['nine', 'Persistence after repeated strain', '여러 고비 뒤에도 이어가는 끈기'],
      ['ten', 'A burden that needs sharing', '나눠야 할 무거운 책임'],
      ['page', 'Curiosity about a new pursuit', '새로운 일에 대한 호기심'],
      ['knight', 'Bold movement with a need for direction', '방향을 살펴야 하는 과감한 움직임'],
      ['queen', 'Confident creativity and warmth', '자신감 있는 창의성과 온기'],
      ['king', 'A long view and purposeful leadership', '긴 안목과 목적 있는 주도성'],
    ] as const satisfies ReadonlyArray<MinorRow>,
    id: 'wands',
    name: {en: 'Wands', ko: '완드'},
  },
  {
    cards: [
      ['ace', 'A new opening in feeling or connection', '감정과 관계의 새로운 시작'],
      ['two', 'Mutual understanding and exchange', '서로를 이해하는 교류'],
      ['three', 'Support found in a circle of people', '함께하는 사람들 속의 지지'],
      ['four', 'Reconsidering what feels fulfilling', '무엇이 만족을 주는지 다시 보기'],
      ['five', 'Grief alongside what still remains', '상실과 함께 남아 있는 것'],
      ['six', 'A memory that shapes the present', '현재에 영향을 주는 추억'],
      ['seven', 'Many appealing but uncertain options', '매력적이지만 불분명한 여러 선택'],
      ['eight', 'Leaving what no longer nourishes', '더는 채워주지 않는 것을 떠나기'],
      ['nine', 'Appreciating a personal wish fulfilled', '이뤄진 바람을 누리기'],
      ['ten', 'A sense of belonging and shared ease', '소속감과 함께 누리는 평안'],
      ['page', 'An unexpected feeling worth exploring', '살펴볼 만한 새로운 감정'],
      ['knight', 'Moving toward an emotional invitation', '마음이 이끄는 제안으로 다가가기'],
      ['queen', 'Attentive care and emotional insight', '세심한 돌봄과 감정의 통찰'],
      ['king', 'Steady feeling amid changing moods', '변하는 감정 속의 안정감'],
    ] as const satisfies ReadonlyArray<MinorRow>,
    id: 'cups',
    name: {en: 'Cups', ko: '컵'},
  },
  {
    cards: [
      ['ace', 'A clear idea cuts through confusion', '혼란을 가르는 분명한 생각'],
      ['two', 'A choice held in uneasy balance', '쉽게 정하지 못한 선택'],
      ['three', 'Pain that asks for honest attention', '정직하게 마주할 필요가 있는 아픔'],
      ['four', 'Rest before the next decision', '다음 판단을 앞둔 휴식'],
      ['five', 'A win that may strain relationships', '관계를 해칠 수도 있는 승리'],
      ['six', 'A gradual move away from difficulty', '어려움에서 천천히 벗어나기'],
      ['seven', 'Choosing strategy and checking motives', '전략을 세우고 의도를 점검하기'],
      ['eight', 'Feeling limited by one way of seeing', '한 가지 시각에 갇힌 느낌'],
      ['nine', 'Worry that grows in solitude', '혼자 있을 때 커지는 걱정'],
      ['ten', 'Acknowledging an exhausting ending', '지친 끝을 인정하기'],
      ['page', 'Curiosity and careful observation', '호기심과 세심한 관찰'],
      ['knight', 'Fast thinking that needs care', '신중함이 필요한 빠른 판단'],
      ['queen', 'Clear boundaries and honest words', '분명한 경계와 솔직한 말'],
      ['king', 'Reasoned judgment and accountability', '이성적인 판단과 책임'],
    ] as const satisfies ReadonlyArray<MinorRow>,
    id: 'swords',
    name: {en: 'Swords', ko: '검'},
  },
  {
    cards: [
      ['ace', 'A practical opportunity to grow', '키워갈 수 있는 현실적인 기회'],
      ['two', 'Balancing changing demands', '바뀌는 요구 사이의 균형'],
      ['three', 'Skill built through collaboration', '협력하며 쌓는 실력'],
      ['four', 'Holding tightly to what feels secure', '안정감을 주는 것을 꼭 쥐기'],
      ['five', 'Difficulty that calls for support', '도움이 필요한 어려움'],
      ['six', 'A fair exchange of help and resources', '도움과 자원을 공정하게 나누기'],
      ['seven', 'Waiting to assess patient effort', '꾸준한 노력의 성과를 살피기'],
      ['eight', 'Practice that strengthens craft', '반복하며 다듬는 숙련'],
      ['nine', 'Independence earned through care', '꾸준함으로 얻은 자립'],
      ['ten', 'Lasting foundations shared with others', '함께 이어갈 단단한 기반'],
      ['page', 'A grounded plan for learning', '배움을 위한 구체적인 계획'],
      ['knight', 'Reliable progress through routine', '일상 속에서 이어가는 성실한 전진'],
      ['queen', 'Practical care for life and others', '삶과 주변을 살피는 현실적인 돌봄'],
      ['king', 'Responsible stewardship of resources', '자원을 책임 있게 다루기'],
    ] as const satisfies ReadonlyArray<MinorRow>,
    id: 'pentacles',
    name: {en: 'Pentacles', ko: '펜타클'},
  },
] as const satisfies ReadonlyArray<{
  readonly id: TarotSuit
  readonly name: Readonly<Record<TarotLocale, string>>
  readonly cards: ReadonlyArray<MinorRow>
}>

export const TAROT_CARDS: ReadonlyArray<TarotCard> = [
  ...MAJOR_ROWS.map(([id, english, korean, meaningEn, meaningKo], number) => {
    const context = {
      en:
        `${english} is Major Arcana number ${number}. ` +
        'Major Arcana concerns overarching life themes and turning points; ' +
        'the number locates this card in the sequence from the Fool (0) to the World (21).',
      ko:
        `${korean}는 메이저 아르카나 ${number}번 카드예요. ` +
        '메이저 아르카나는 삶의 큰 주제와 전환을 다루고, ' +
        '번호는 광대(0)에서 세계(21)로 이어지는 상징의 순서 속 위치를 나타내요.',
    }
    return {
      arcana: 'major' as const,
      id,
      meaning: {
        en: `${context.en} Upright: ${meaningEn}.`,
        ko: `${context.ko} 정방향: ${meaningKo}.`,
      },
      name: {en: english, ko: korean},
      reversedMeaning: {
        en: `${context.en} Reversed: ${REVERSED_MEANINGS[id].en}`,
        ko: `${context.ko} 역방향: ${REVERSED_MEANINGS[id].ko}`,
      },
    }
  }),
  ...SUITS.flatMap((suit) =>
    suit.cards.map(([rank, meaningEn, meaningKo]) => {
      const id = `${suit.id}-${rank}` as const
      const name = {
        en: `${RANKS[rank].en} of ${suit.name.en}`,
        ko: `${suit.name.ko} ${RANKS[rank].ko}`,
      }
      const context = {
        en:
          `${name.en} is a Minor Arcana card, concerned with everyday experiences. ` +
          `${SUIT_CONTEXT[suit.id].en} ${RANK_CONTEXT[rank].en}`,
        ko: `${name.ko}는 일상적인 경험을 다루는 마이너 아르카나 카드예요. ${SUIT_CONTEXT[suit.id].ko} ${RANK_CONTEXT[rank].ko}`,
      }
      return {
        arcana: 'minor' as const,
        id,
        meaning: {
          en: `${context.en} Upright: ${meaningEn}.`,
          ko: `${context.ko} 정방향: ${meaningKo}.`,
        },
        name,
        reversedMeaning: {
          en: `${context.en} Reversed: ${REVERSED_MEANINGS[id].en}`,
          ko: `${context.ko} 역방향: ${REVERSED_MEANINGS[id].ko}`,
        },
        suit: suit.id,
      }
    }),
  ),
]

export interface DrawTarotCardsOptions {
  readonly count: TarotDrawCount
  readonly random?: () => number
}

/** Draws distinct cards without modifying the shared deck. */
export const drawTarotCards = (options: DrawTarotCardsOptions): ReadonlyArray<DrawnTarotCard> => {
  const remaining = [...TAROT_CARDS]
  const random = options.random ?? Math.random

  return Array.from({length: options.count}, () => {
    const index = Math.floor(random() * remaining.length)
    const [card] = remaining.splice(index, 1)
    if (card === undefined) {
      throw new Error('Tarot deck exhausted')
    }
    return {...card, orientation: random() < UPRIGHT_PROBABILITY ? 'upright' : 'reversed'}
  })
}
