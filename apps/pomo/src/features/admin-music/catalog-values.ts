/** 카탈로그 검증과 DB enum이 공유하는 앨범 상태다. 값과 순서를 읽기 전용으로 사용한다. */
export const ALBUM_STATUSES = ['draft', 'published', 'archived'] as const

/** 카탈로그 검증과 DB enum이 공유하는 트랙 자산 상태다. 전이·저장 정책은 각 사용처가 소유한다. */
export const TRACK_ASSET_STATUSES = [
  'pending',
  'uploaded',
  'ready',
  'active',
  'failed',
  'retired',
  'deleted',
] as const

export const COVER_FALLBACKS = ['lp', 'cd', 'music'] as const
