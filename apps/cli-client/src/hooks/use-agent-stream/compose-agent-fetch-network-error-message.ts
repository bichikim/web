export const composeAgentFetchNetworkErrorMessage = (args: {
  readonly reason: string
  readonly requestUrl: string
  readonly postUrlFallback: string
}): string => {
  const target = args.requestUrl.length > 0 ? args.requestUrl : args.postUrlFallback.trim()

  return [
    `요청 실패: ${args.reason}`,
    `주소: ${target}`,
    '',
    '확인사항:',
    '1) cli-server 실행 여부',
    '2) 서버 CORS 허용 여부',
    '3) 브라우저에서 해당 주소 직접 접속 가능 여부',
  ].join('\n')
}
