export interface ProcessFailureIndicatorsInput {
  readonly exitCode: number | null
  readonly signalText: string
  readonly stderrText: string
}

export const hasProcessFailureIndicators = (input: ProcessFailureIndicatorsInput): boolean => {
  const stderrTrimmed = input.stderrText.trim()

  return (
    (input.exitCode !== null && input.exitCode !== 0) ||
    input.signalText.length > 0 ||
    stderrTrimmed.length > 0
  )
}
