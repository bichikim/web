# Silent fallback holdout

이 holdout은 `unexpected-error-becomes-success-like-result`를 만들 때 사용한 calibration
fixture와 분리되어 있다. 파일명에는 정답을 넣지 않았으며, 아래 표의 `expected`만 평가
oracle로 사용한다.

## 구성 원칙

- `pass`: 반환형, 문서 또는 오류 guard가 fallback을 정상 계약이나 명시적 실패로 확정한다.
- `fail`: 실제 정상 코드에서 오류 guard 또는 실패 discriminant 하나만 제거한 mutation이다.
- `uncertain`: 단일 파일만으로 fallback과 장애 은폐 중 어느 쪽인지 확정할 계약이 없다.
- mutation은 한 가지 계약 요소만 바꾼다. 나머지 구조는 출처의 역할을 유지한다.
- 출처 코드는 fixture 작성 근거로만 사용한다. 원본 프로젝트의 품질 판정이나 버그 보고가
  아니다.

## 출처와 독립 정답

| Fixture                    | expected  | 실제 출처                                                                                                              | 근거 또는 mutation                                                                                    |
| -------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `clipboard-operation.ts`   | pass      | `apps/pomo/src/features/tools/clipboard.ts`의 `copyToolResult`                                                         | `Promise<boolean>`에서 `true`는 성공, `false`는 명시적 실패다.                                        |
| `timer-state.ts`           | pass      | `apps/pomo/src/features/pomodoro-timer/storage.ts`의 `readPomodoroTimerState`                                          | 문서가 missing, invalid, unavailable을 모두 `null` 계약으로 선언한다.                                 |
| `partial-download.ts`      | pass      | `apps/pomo/src/features/model-storage/resumable-fetch/storage.ts`의 `get`                                              | `NotFoundError`만 `null`로 바꾸고 나머지는 rethrow한다.                                               |
| `admin-draft-result.ts`    | pass      | `apps/pomo/src/features/admin-music/album-draft-storage.ts`의 `readAlbumDraftData`                                     | `success: false`와 `error`가 실패를 명시한다.                                                         |
| `desktop-mode.ts`          | pass      | `apps/pomo/src/features/desktop-mode/storage.ts`의 `readDesktopModeStorage`                                            | 문서가 storage 불가 시 `normal` fallback을 선언한다.                                                  |
| `account-session.ts`       | fail      | `apps/pomo/src/features/user-auth/web-session.ts`의 `readAccountSession`                                               | 원본의 401 guard와 rethrow를 제거해 모든 HTTP 및 인프라 실패가 로그아웃처럼 보이게 한 mutation이다.   |
| `download-metadata.ts`     | fail      | `apps/pomo/src/features/model-storage/resumable-fetch/storage.ts`의 `get`                                              | 원본의 `NotFoundError` guard와 rethrow를 제거해 손상 및 권한 오류까지 cache miss로 바꾼 mutation이다. |
| `feed-refresh.ts`          | fail      | `apps/pomo/src/features/focus-room-feed/use-feed-connections.ts`의 load/save 흐름                                      | 사용자 오류 상태 대신 빈 목록을 반환하도록 바꿔 실패와 실제 빈 feed를 합친 mutation이다.              |
| `session-history.ts`       | fail      | `apps/pomo/src/features/user-auth/session-query.ts`의 세션 실패 처리                                                   | 실패 상태 전달을 제거하고 모든 조회 실패를 빈 history로 바꾼 mutation이다.                            |
| `user-preferences.ts`      | fail      | `apps/pomo/src/features/focus-room-scene-preferences/create-p-scene-preferences-repository.ts`의 다중 저장소 복구 흐름 | web/native fallback과 오류 구분을 제거해 모든 실패가 미설정처럼 보이게 한 mutation이다.               |
| `calendar-cache.ts`        | uncertain | `apps/pomo/src/features/calendar/month-cache.ts`의 `readCache`                                                         | cache가 선택적이라는 호출 계약이 이 파일에는 없어서 장애를 `null`로 합쳐도 되는지 확정할 수 없다.     |
| `clean-exit-state.ts`      | uncertain | `apps/pomo/src/features/desktop-mode/storage.ts`의 `readCleanExitStorage`                                              | `false`가 보수적 crash-recovery 신호인지 숨겨진 storage 실패인지 이 함수만으로는 확정할 수 없다.      |
| `client-error-property.ts` | uncertain | `apps/pomo/src/features/client-error-reporter/reporter.ts`의 `readProperty`                                            | hostile getter를 건너뛰는 best-effort 수집인지 필수 필드 손실인지 호출 목적이 필요하다.               |
| `model-cache.ts`           | uncertain | `apps/pomo/src/features/model-storage/resumable-fetch.ts`의 partial model read                                         | 로그 후 `null`이 재다운로드 신호인지 복구 불가능한 장애 은폐인지 이 파일에는 계약이 없다.             |
| `product-asset-url.ts`     | uncertain | `apps/pomo/src/features/product-assets/index.ts`의 `getPomoR2AssetUrl`                                                 | invalid input을 허용하는 parser인지 programmer error를 숨기는 내부 helper인지 공개 계약이 없다.       |

## 해석

이 세트는 높은 점수를 만들기 위한 예제가 아니다. 특히 `false`가 명시적 실패인
`clipboard-operation.ts`와 문서 없는 broad catch 5개는 현재 AST 휴리스틱의 약점을 드러내도록
그대로 유지한다. 결과를 본 뒤 fixture 라벨이나 코드를 규칙에 맞춰 수정하면 holdout 효력이
사라진다.
