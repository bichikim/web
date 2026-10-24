const LABELS: Readonly<Record<string, string>> = {
  Interrupt: '중단',
  PermissionRequest: '승인 요청',
  PostToolUse: '도구 실행 후',
  PreToolUse: '도구 실행 전',
  SessionStart: '연결 시작',
  Stop: '응답 종료',
  UserPromptSubmit: '작업 시작',
}

export const codexEventLabel = (name: string) => LABELS[name] ?? name
