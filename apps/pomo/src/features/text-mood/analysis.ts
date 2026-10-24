import type {MoodModifierId, PrimaryMoodId} from './labels'

export interface MoodScore {
  readonly id: PrimaryMoodId
  readonly probability: number
}

export interface MoodModifierScore {
  readonly active: boolean
  readonly id: MoodModifierId
  readonly probability: number
  readonly threshold: number
}

export interface TextMoodAnalysis {
  readonly margin: number
  readonly modifiers: ReadonlyArray<MoodModifierScore>
  readonly primary: MoodScore
  readonly scores: ReadonlyArray<MoodScore>
  readonly secondary: MoodScore | null
  readonly uncertain: boolean
}

export interface TextSufficiencyAnalysis {
  readonly insufficient: boolean
  readonly probability: number
  readonly threshold: number
}
