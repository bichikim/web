interface LanguageLearningAudioUrl {
  readonly audioUrl: string
}

export const revokeLanguageLearningAudioUrls = (
  candidates: ReadonlyArray<LanguageLearningAudioUrl>,
) => {
  for (const candidate of candidates) {
    URL.revokeObjectURL(candidate.audioUrl)
  }
}
