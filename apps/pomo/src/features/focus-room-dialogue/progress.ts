const MAXIMUM_PROGRESS = 100
const MAXIMUM_GENERATING_PROGRESS = 96

export interface CalculateDialogueScriptProgressOptions {
  readonly completed: boolean
  readonly generatedLength: number
  readonly targetLength: number
}

/** Calculates character-based draft progress and reserves 100% for completion. */
export const calculateDialogueScriptProgress = (
  options: CalculateDialogueScriptProgressOptions,
): number => {
  if (options.completed) {
    return MAXIMUM_PROGRESS
  }

  const targetLength = Math.max(1, options.targetLength)
  const progress = Math.floor(
    (options.generatedLength / targetLength) * MAXIMUM_GENERATING_PROGRESS,
  )
  return Math.min(MAXIMUM_GENERATING_PROGRESS, Math.max(0, progress))
}
