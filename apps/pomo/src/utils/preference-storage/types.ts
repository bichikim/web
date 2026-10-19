export type PreferenceStorageResult<Value> = Value | Promise<Value>

/** 디코딩된 설정을 저장한다. 쓰기에 성공하면 null 또는 undefined를, 실패하면 오류를 반환한다. */
export interface PreferenceStorage {
  readonly read: (key: string) => PreferenceStorageResult<unknown>
  readonly write: (key: string, value: unknown) => PreferenceStorageResult<unknown | null>
  /** 외부 변경을 알리며, null은 모든 키를 무효화한다. 동기 구독 해제 함수를 반환한다. */
  readonly subscribe?: (onChange: (key: string | null) => void) => () => void
}
