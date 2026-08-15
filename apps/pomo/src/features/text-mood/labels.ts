export const PRIMARY_MOOD_IDS = [
  'cheerful',
  'calm',
  'warm',
  'hopeful',
  'dreamlike',
  'awe',
  'nostalgic',
  'sad',
  'anxious',
  'fearful',
  'angry',
  'neutral',
] as const

export type PrimaryMoodId = (typeof PRIMARY_MOOD_IDS)[number]

export const MOOD_MODIFIER_IDS = ['playful', 'sarcastic'] as const

export type MoodModifierId = (typeof MOOD_MODIFIER_IDS)[number]

export interface MoodDefinition {
  readonly description: string
  readonly icon: string
  readonly id: PrimaryMoodId
  readonly label: string
}

export const PRIMARY_MOODS: ReadonlyArray<MoodDefinition> = [
  {description: '현재의 기쁨, 신남, 활기', icon: '😄', id: 'cheerful', label: '밝음·즐거움'},
  {description: '차분함, 편안함, 안정감', icon: '😌', id: 'calm', label: '평온·여유'},
  {description: '다정함, 친밀감, 위로', icon: '🥰', id: 'warm', label: '따뜻함·애정'},
  {description: '미래에 대한 기대와 긍정', icon: '😊', id: 'hopeful', label: '희망·기대'},
  {
    description: '비현실적이고 환상적인 느낌',
    icon: '😶‍🌫️',
    id: 'dreamlike',
    label: '신비·몽환',
  },
  {description: '감탄, 압도됨, 신기함', icon: '😮', id: 'awe', label: '놀라움·경이'},
  {
    description: '외로움, 회상, 잔잔한 슬픔',
    icon: '😔',
    id: 'nostalgic',
    label: '쓸쓸함·그리움',
  },
  {description: '상실, 절망, 분명한 침울함', icon: '😢', id: 'sad', label: '슬픔·우울'},
  {
    description: '걱정, 초조함, 나쁜 일의 예감',
    icon: '😟',
    id: 'anxious',
    label: '불안·긴장',
  },
  {description: '위협, 위험, 무서움', icon: '😨', id: 'fearful', label: '어두움·공포'},
  {description: '화, 공격성, 강한 불만', icon: '😠', id: 'angry', label: '분노·적대'},
  {
    description: '뚜렷한 감정이나 분위기가 없음',
    icon: '😐',
    id: 'neutral',
    label: '중립',
  },
]

export interface MoodModifierDefinition {
  readonly description: string
  readonly icon: string
  readonly id: MoodModifierId
  readonly label: string
}

export const MOOD_MODIFIERS: ReadonlyArray<MoodModifierDefinition> = [
  {description: '농담, 장난, 가벼운 과장', icon: '😜', id: 'playful', label: '장난스러움'},
  {description: '반어, 비꼼, 냉소', icon: '😏', id: 'sarcastic', label: '냉소·비꼼'},
]

export const getPrimaryMood = (id: PrimaryMoodId) => {
  const mood = PRIMARY_MOODS.find((candidate) => candidate.id === id)

  if (mood === undefined) {
    throw new Error(`Unknown primary mood: ${id}`)
  }

  return mood
}
