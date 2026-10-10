import {errorSchema, type ViewerError} from '../shared/contracts'

const messages: Record<ViewerError['code'], string> = {
  'already-exists': '같은 이름의 파일이나 폴더가 이미 있습니다. 다른 이름을 입력해 주세요.',
  'create-failed': '만들지 못했습니다. 대상 폴더와 파일 권한을 확인해 주세요.',
  'entry-changed': '파일이나 폴더가 변경되었습니다. 다시 선택한 뒤 작업해 주세요.',
  'file-operation-failed':
    '파일 작업을 완료하지 못했습니다. 목록을 확인하고 파일 권한과 남은 공간을 확인해 주세요.',
  'host-path-missing':
    'Codex가 파일 경로를 전달하지 않았습니다. code.open 도구로 파일을 열어 주세요.',
  'invalid-destination': '이 위치에 붙여넣을 수 없습니다. 다른 폴더를 선택해 주세요.',
  'invalid-name':
    '파일이나 폴더 이름을 확인해 주세요. 경로 구분자와 숨김·생성 폴더 이름은 사용할 수 없습니다.',
  'invalid-position': '이 위치에서는 이동할 대상을 찾을 수 없습니다.',
  'media-too-large': '128 MiB보다 큰 문서·이미지·영상·음악은 이 뷰어에서 열 수 없습니다.',
  'not-found': '파일을 찾을 수 없습니다.',
  'operation-too-large': '파일과 폴더가 10,000개를 넘는 항목은 한 번에 처리할 수 없습니다.',
  'outside-workspace': '작업 폴더 밖의 파일은 열 수 없습니다.',
  'protected-entry': '보호된 경로나 심볼릭 링크가 포함되어 이 작업을 수행할 수 없습니다.',
  'python-analysis-failed':
    '파이썬 정의를 분석하지 못했습니다. 프로젝트 설정을 확인하고 뷰어를 다시 열어 주세요.',
  'python-analyzer-unavailable':
    '파이썬 분석기를 실행할 수 없습니다. 플러그인 설치 상태를 확인하고 뷰어를 다시 열어 주세요.',
  'read-failed': '파일을 읽지 못했습니다. 연결과 파일 권한을 확인해 주세요.',
  'ruby-analysis-failed':
    'Ruby 정의를 분석하지 못했습니다. Ruby 버전과 프로젝트의 gem 설정을 확인하고 뷰어를 다시 열어 주세요.',
  'ruby-analyzer-unavailable':
    'Ruby 분석기를 실행할 수 없습니다. 프로젝트에 맞는 Ruby 환경에서 gem install solargraph를 실행한 뒤 뷰어를 다시 열어 주세요.',
  'rust-analysis-failed':
    'Rust 정의를 분석하지 못했습니다. Cargo 프로젝트 설정을 확인하고 뷰어를 다시 열어 주세요.',
  'rust-analyzer-unavailable':
    '내장 Rust 분석기를 실행할 수 없습니다. 플러그인 설치 상태를 확인하고 뷰어를 다시 열어 주세요.',
  'session-expired': '연결이 종료되었습니다. Codex에서 파일을 다시 열어 주세요.',
  'stale-document': '파일이 변경되었습니다. 새로고침한 뒤 다시 이동해 주세요.',
  'too-large': '512 KiB보다 큰 파일은 이 뷰어에서 열 수 없습니다.',
  'unsupported-file': '지원하지 않는 파일 형식입니다.',
  'write-conflict':
    '다른 곳에서 파일이 변경되어 저장하지 않았습니다. 초안을 복사하거나 변경을 버린 뒤 원본을 다시 확인해 주세요.',
  'write-failed':
    '파일을 저장하지 못했습니다. 파일 권한과 남은 공간을 확인해 주세요. 초안은 유지됩니다.',
}

export const errorMessage = (error: unknown): string => {
  const parsed = errorSchema.safeParse(error)
  if (parsed.success) {
    return messages[parsed.data.code]
  }
  return error instanceof Error ? error.message : 'Code Viewer 연결을 확인해 주세요.'
}
