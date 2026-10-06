import {errorSchema, type ViewerError} from '../shared/contracts'

const messages: Record<ViewerError['code'], string> = {
  'host-path-missing':
    'Codex가 파일 경로를 전달하지 않았습니다. code.open 도구로 파일을 열어 주세요.',
  'invalid-position': '이 위치에서는 이동할 대상을 찾을 수 없습니다.',
  'not-found': '파일을 찾을 수 없습니다.',
  'outside-workspace': '작업 폴더 밖의 파일은 열 수 없습니다.',
  'read-failed': '파일을 읽지 못했습니다. 연결과 파일 권한을 확인해 주세요.',
  'session-expired': '연결이 종료되었습니다. Codex에서 파일을 다시 열어 주세요.',
  'stale-document': '파일이 변경되었습니다. 새로고침한 뒤 다시 이동해 주세요.',
  'too-large': '512 KiB보다 큰 파일은 이 뷰어에서 열 수 없습니다.',
  'unsupported-file': '지원하지 않는 파일 형식입니다.',
}

export const errorMessage = (error: unknown): string => {
  const parsed = errorSchema.safeParse(error)
  if (parsed.success) {
    return messages[parsed.data.code]
  }
  return error instanceof Error ? error.message : 'Code Viewer 연결을 확인해 주세요.'
}
