export interface SoundEffectTitle {
  readonly en: string
  readonly ko: string
}

export interface SoundEffect {
  readonly artworkUrl: string
  readonly durationSeconds: number
  readonly id: string
  readonly source: string
  readonly title: SoundEffectTitle
}
