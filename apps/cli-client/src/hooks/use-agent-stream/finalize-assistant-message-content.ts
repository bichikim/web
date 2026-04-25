export const finalizeAssistantMessageContent = (args: {
  readonly display: string
  readonly aborted: boolean
  readonly hasStreamFailure: boolean
}): string => {
  if (args.aborted) {
    const suffix = '\n\n(응답이 중단되었습니다.)'

    return args.display.length > 0 ? `${args.display}${suffix}` : '(응답이 중단되었습니다.)'
  }

  if (args.display.length === 0 && args.hasStreamFailure) {
    return '(응답을 생성하지 못했습니다. 오류 메시지를 확인해 주세요.)'
  }

  return args.display
}
