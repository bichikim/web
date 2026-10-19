import {english} from '../../../src/viewer/locale/messages'
import {translate} from '../../../src/viewer/locale/translate'
import type {MessageKey, MessageValues, ViewerLanguage} from '../../../src/viewer/locale/types'

const messages = new Map<string, string>([
  ['시트', 'Sheet'],
  ['이미지 크기가 Pane 표시 한도를 초과했습니다.', 'The image exceeds the Pane display limit.'],
  ['파일', 'Files'],
  ['트리 너비', 'Tree width'],
  ['표시', 'Show'],
  ['숨김', 'Hide'],
  ['언어', 'Language'],
  ['표시 설정', 'Display settings'],
  ['자동 추적 일시정지', 'Following paused'],
  ['자동 추적 켜짐', 'Following on'],
  ['너비에 따라', 'Fit to width'],
  ['트리 배치', 'Tree placement'],
  ['문서 옆', 'Beside document'],
  ['문서 위', 'Above document'],
  ['좁게', 'Narrow'],
  ['보통', 'Medium'],
  ['넓게', 'Wide'],
  ['긴 줄', 'Long lines'],
  ['표시 줄', 'Visible lines'],
  ['줄바꿈', 'Wrap'],
  ['줄 번호', 'Line numbers'],
  ['한 줄로', 'No wrap'],
  ['사용처 미리보기', 'Reference preview'],
  ['파일 경로 또는 검색어...', 'File path or search...'],
  ['파일 필터링...', 'Filter files...'],
  ['모두 제거', 'Remove all'],
  ['프로젝트 파일을 선택하세요.', 'Select a project file.'],
  ['편집 마침', 'Finish editing'],
  ['정렬 열', 'Sort column'],
  ['표 필터', 'Filter table'],
  ['정렬 없음', 'No sorting'],
  ['표가 비어 있습니다.', 'The table is empty.'],
  ['첫 행: 제목', 'First row: header'],
  ['표시 한도에 도달했습니다.', 'Display limit reached.'],
  ['내림차순', 'Descending'],
  ['첫 행: 데이터', 'First row: data'],
  ['오름차순', 'Ascending'],
  ['다음 행', 'Next rows'],
  ['이전 행', 'Previous rows'],
  ['문서 내 검색', 'Find in document'],
  ['시작 열', 'Start column'],
  ['시작 줄', 'Start line'],
  ['끝 열 (제외)', 'End column (exclusive)'],
  ['끝 줄', 'End line'],
  ['import 경로', 'Import path'],
  ['선택 범위 채팅에 추가', 'Add selection to chat'],
  ['다시 실행', 'Redo'],
  ['실행 취소', 'Undo'],
  ['디스크 변경 · 초안 유지', 'Disk changed · draft retained'],
  ['미저장 변경을 버릴까요?', 'Discard unsaved changes?'],
  ['검색을 완료하지 못했습니다.', 'Search could not be completed.'],
  ['위치 확인 중…', 'Finding locations…'],
  [
    '파일 목록 제한에 도달했습니다. 경로로 열 수 있습니다.',
    'File list limit reached. Open by path.',
  ],
  ['작업 메뉴', 'Actions'],
  ['파일 탐색 · 뒤로, 앞으로, 새로고침', 'File navigation · back, forward, refresh'],
  ['선택·첨부', 'Selection and context'],
  ['사용처 팝업', 'References popup'],
  ['줄로 이동', 'Go to line'],
  ['복사  ⌘/Ctrl C', 'Copy  ⌘/Ctrl C'],
  ['붙여넣기  ⌘/Ctrl V', 'Paste  ⌘/Ctrl V'],
  ['잘라내기  ⌘/Ctrl X', 'Cut  ⌘/Ctrl X'],
  ['정의·사용처  F12', 'Definition / references  F12'],
  ['채팅 첨부 {count}', 'Chat context {count}'],
  ['파일 내 검색  ⌘/Ctrl F', 'Find in file  ⌘/Ctrl F'],
  ['열 {count}', 'Column {count}'],
  ['첨부 {count}', 'Context {count}'],
  ['{count}줄', '{count} lines'],
  [
    '{kind} · 아직 Pane 미리보기를 지원하지 않습니다.',
    '{kind} · Pane preview is not available yet.',
  ],
])

const isSharedMessage = (message: string): message is MessageKey => Object.hasOwn(english, message)
/** Translates UI templates while leaving unknown content unchanged. */
export const paneTranslate = (
  language: ViewerLanguage,
  message: string,
  values: MessageValues = {},
): string => {
  if (isSharedMessage(message)) {
    return translate(language, message, values)
  }
  const template = language === 'en' ? (messages.get(message) ?? message) : message
  return template.replace(/\{(?<key>\w+)\}/gu, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder,
  )
}
