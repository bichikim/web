export const composeAgentStreamFailureErrorMessage = (args: {
  readonly requestUrl: string
  readonly exitCode: number | null
  readonly exitSignalText: string
  readonly stderrOutput: string
}): string => {
  const errorLines: string[] = []

  if (args.exitCode !== null && args.exitCode !== 0) {
    errorLines.push(`종료 코드: ${String(args.exitCode)}`)
  }

  if (args.exitSignalText.length > 0) {
    errorLines.push(`종료 시그널: ${args.exitSignalText}`)
  }

  const stderrText = args.stderrOutput.trim()

  if (stderrText.length > 0) {
    errorLines.push(`stderr:\n${stderrText}`)
  }

  return `CLI 실행 중 오류가 발생했습니다.\n주소: ${args.requestUrl}\n\n${errorLines.join('\n\n')}`
}
