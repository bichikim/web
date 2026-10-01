# 공통 기능 리팩터링 완료 기록

2026-09-20 기준 작업 시작 시 읽은 Refactor 이슈 92개(열림 23개, 닫힘 69개) 중 열린 이슈를 구현 대상으로 검토했다. 아래 결과는 로컬 작업 트리 기준이며 GitHub 이슈 종료나 배포를 의미하지 않는다.

## 구성 원칙

값 선택·레코드 갱신 같은 순수 연산, 저장·Worker·HTTP 같은 공통 처리, 각 기능의 정책을 분리했다. 기존 표준 API와 공통 모듈을 먼저 사용하고, 여러 호출부가 실제로 공유하는 계약만 추출했다. 저장 우선순위, 오류 전파, 정리 순서, 범위 경계는 호출부의 기존 동작을 유지했다.

## 이슈별 결과

| 이슈  | 결과와 구현 위치                                                                                                                                                                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1626 | [presence flag](../../../src/features/value-storage/create-presence-flag.ts)로 존재 여부 저장 공통화                                                                                     |
| #1627 | [선택적 레코드 항목](../../../src/utils/set-optional-record-entry/index.ts) 갱신·삭제 공통화                                                                                             |
| #1617 | [네이티브 우선 preference](../../../src/features/authoritative-preference/index.ts) 처리 공통화                                                                                          |
| #1616 | [preference 읽기 복구·쓰기](../../../src/features/preference-persistence/index.ts) 연산을 합성하도록 변경. 기존 versioned repository로 통째로 대체하지 않아 네이티브 저장 실패 전파 유지 |
| #1576 | draft reference·desktop mode·wake lock·viewed release의 기존 직렬 큐 재사용. 앨범 초안의 실패 후 중단 체인은 유지                                                                        |
| #1577 | [오류 메시지 추출](../../../src/features/error-detail/index.ts) 공통화. 기본 문구의 지연 평가와 빈 Error.message 유지                                                                    |
| #1564 | [초안 저장](../../../src/features/value-storage/create-draft-storage.ts) 공통화                                                                                                          |
| #1565 | [Blob URL 교체](../../../src/features/blob-object-url/index.ts) 공통화. revoke→생성 순서를 유지하고, 생성 우선인 이미지 경로는 유지                                                      |
| #1549 | [최댓값 선택](../../../src/utils/select-maximum-by/index.ts)을 저장 시각 비교에 적용                                                                                                     |
| #1548 | [다운로드 진행률](../../../src/features/download-progress/index.ts) 공통화. 100% 상한이 없는 텍스트 생성 계산은 별도 유지                                                                |
| #1536 | [예약 저장](../../../src/features/pending-save/index.ts)의 취소·flush 공통화                                                                                                             |
| #1535 | [파싱 저장 어댑터](../../../src/features/parsed-preference-storage/index.ts) 공통화                                                                                                      |
| #1517 | [JSON 본문 실패 응답](../../../src/server/http/invalid-json-body-response.ts) 공통화                                                                                                     |
| #1516 | [카탈로그 ID·요청 정책](../../../src/features/catalog-policy/index.ts) 공통화                                                                                                            |
| #1505 | 변경하지 않음. 동일값 중복 제거에는 기존 JavaScript Set으로 충분하여 라이브러리 래퍼로 교체하지 않음                                                                                     |
| #1506 | [잠금 배치 삭제](../../../src/server/database/delete-locked-batch.ts) SQL 공통화                                                                                                         |
| #1504 | 변경하지 않음. isPlainObject는 기존 object 검사보다 배열·클래스 인스턴스 허용 범위를 좁히므로 구조 변경과 분리                                                                           |
| #1503 | [태그 파서](../../../src/features/language-learning)의 변환·필터·중복 제거·개수 제한을 파이프라인으로 구성                                                                               |
| #1502 | clamp 재사용. 투어의 역전된 경계는 정규화하여 기존 위치 계산 유지                                                                                                                        |
| #1492 | [Worker 실패 처리](../../../src/features/worker-failure/index.ts) 공통화                                                                                                                 |
| #1493 | [text-mood 클라이언트](../../../src/features/text-mood/client.ts)를 공통 Worker RPC로 전환                                                                                               |
| #1481 | [배열 저장](../../../src/features/value-storage/create-collection-storage.ts)을 단어·문장 저장에 적용                                                                                    |
| #1480 | [인증 cron 핸들러](../../../src/server/cron/create-authorized-cron-handler.ts) 공통화                                                                                                    |

추가 저장 형식은 codec, 저장 매체는 storage 계약을 조합할 수 있다. 현재 소비자가 사용하는 경계에 타입을 두는 정도여서 별도 프레임워크나 설정 계층은 추가하지 않았다.

## 검증 범위

- 변경 영향 범위 478개 파일: Wallaby 3,047개 통과, 실패·건너뜀 없음.
- 음원 확장 파일: Vitest 24개 통과(테스트 실행 626ms). Wallaby에서는 300초 음원 조립 테스트가 5초 제한을 넘어 23개 통과·1개 시간 초과가 반복됐다. 제한이나 테스트를 변경하지 않고 기본 Vitest로 동일 파일을 검증했다. 두 실행기의 결과를 합쳐 Wallaby 전체 통과로 해석하지 않는다.
- Pomo `pnpm --filter @apps/pomo typecheck` 통과.
- 변경된 TypeScript 파일 144개 oxlint 오류·경고 없음.
- `pnpm format` 및 `git diff --check` 통과.

단위 테스트와 타입 검사는 실제 PostgreSQL 동시 실행, Toss 기기 저장소, 배포 환경 및 브라우저 화면 검증을 대신하지 않는다.

# 열린 리팩터링 이슈 실행 계획

2026-10-01 열린 GitHub 이슈 99개 중 Refactor 라벨 또는 제목을 가진 79개 전체가 대상이다. 기준 커밋 `9ffe4ee36`은 조회 시 origin/dev와 동일하다. 기존 AGENTS.md 변경을 보존한다.

## 완료 조건과 작업 순서

공통 계약을 먼저 만들고 연결된 호출부를 모두 전환한다. 후속 이슈는 본체와 함께 처리하되 번호별 완료 조건을 확인한다. 기존 동작을 보존하고 명시된 오류 수정만 포함한다. 각 묶음은 관련 기존 테스트를 실행하고 변경 후 같은 계약을 검증한다. 마지막에 Pomo 타입 검사, 저장소 oxlint, pnpm format, diff 검사를 수행한다. 실제 FS·TCP·Worker 로딩 검증은 기존 integration 실행 경계로 옮기고 계약 검증을 유지한다. 브라우저 렌더링·Toss 기기 저장소·배포 검증은 별도 결과로 기록한다. 원격 이슈 종료는 구현 완료와 구분한다.

## 이슈별 범위와 검증 기준

### 공통 수치·문자열·입력

- [x] [#2193](https://github.com/bichikim/web/issues/2193) Pomo trailing-slash pathname 정규화가 복제됨 — normalizePathname (#2185/#2176 follow-up)
  - [x] pathname trailing-slash 정규화 구현이 한 곳
  - [x] route/dev/404 복제 제거
  - [x] feed `normalizeFeedUrl`·`getDocumentUrl`이 동일 pathname 계약 (`\/+$`)
  - [x] 동작 변경 없음 / 관련 테스트·lint 통과 (`schema` trailing-slash · `feed-sync` self-link 스펙 유지)

- [x] [#2214](https://github.com/bichikim/web/issues/2214) Pomo UTC civil date 추출이 use-picker·civil-date addDays에 복제됨 — civilDateFromUtc (#2194 follow-up)
  - [x] UTC→`CivilDate` 추출 구현이 한 곳
  - [x] `use-picker` empty open·`addDays`가 그 helper를 씀
  - [x] `#2194` UTC empty-picker 회귀 스펙 유지
  - [x] 관련 테스트·lint 통과

- [x] [#2232](https://github.com/bichikim/web/issues/2232) Pomo 복무 계산기 자동 입대일 하한 `2022-01-01`이 Service·calculateService에 복제됨 — AUTOMATIC_START_MINIMUM (#2211 leftover)
  - [x] 자동 입대일 하한 상수가 tools feature 한 곳
  - [x] `Service.tsx`·`calculateService`가 그 상수를 공유
  - [x] 직접 입력 해제 보정·자동 계산 null 가드·관련 스펙 / typecheck / lint 통과

- [x] [#2265](https://github.com/bichikim/web/issues/2265) Pomo 캘린더 NLU 제외 regex가 오늘·내일·모레·이번 주에 복제됨 — createCalendarExclusionPattern (#2239/#2249 leftover)
  - [x] exclusion suffix(+ optional lookahead) 구현이 한 곳
  - [x] 오늘·내일·모레·이번 주 제외 계약이 #2239/#2249 스펙과 동일
  - [x] 관련 calendar query 스펙·lint 통과

- [x] [#2266](https://github.com/bichikim/web/issues/2266) Pomo 내일 알림 date reference가 MemoryMemoItem·use-memo-creator에 복제됨 — resolveReminderDateReference (#2238 leftover)
  - [x] 선행 수정 확인: 원문의 tomorrow/edit-opened 분기는 현재 코드에서 이미 제거됨
  - [x] MemoryMemoItem·use-memo-creator 모두 기존 `resolveReminderAt`에 저장 시각을 전달함
  - [x] #2238 자정 경과 「내일」 회귀 스펙 유지
  - [x] 관련 테스트·lint 통과

- [x] [#2272](https://github.com/bichikim/web/issues/2272) Refactor: Pomo sound-joining·cloth-renderer unit progress Math.min(1,…) leftover — clampUnit (#2050/#2079 follow-up)
  - [x] 위 두 사이트가 `clampUnit`을 씀
  - [x] edge blend·cloth limit 스케일 수치 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2291](https://github.com/bichikim/web/issues/2291) Refactor: Pomo steam-particle fadeIn·fadeOut Math.min/max(1|0,…) leftover — clampUnit (#2079/#2272 follow-up)
  - [x] steam `getOpacity` fadeIn/fadeOut이 `clampUnit`을 씀
  - [x] particle alpha 곡선·MAXIMUM_ALPHA 수치 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2310](https://github.com/bichikim/web/issues/2310) Refactor: Pomo getDownloadPercentage Math.min(100,…) leftover — es-toolkit/math clamp
  - [x] `getDownloadPercentage`가 `es-toolkit/math` `clamp`를 씀
  - [x] 다운로드 퍼센트 계약(최대 100)·호출부 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2314](https://github.com/bichikim/web/issues/2314) Refactor: Pomo classify-tiny-speech-number Array.from(new Set(…)) leftover — es-toolkit/array uniq (#1505 follow-up)
  - [x] `getFeatureIndexes`가 `es-toolkit/array` `uniq`를 씀
  - [x] hashed feature index 순서·중복 제거 계약 유지
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2321](https://github.com/bichikim/web/issues/2321) Refactor: Pomo use-page-turn·use-swipe-track-gesture axis resolve twin — resolvePointerGestureAxis
  - [x] page-turn·swipe가 공유 helper로 pending→horizontal|vertical을 판정
  - [x] page-turn touch vertical cancel · swipe vertical release 계약 유지
  - [x] intent distance(8) 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2322](https://github.com/bichikim/web/issues/2322) Refactor: Pomo cloth-contact projectInitial Math.max(0, Math.min(1,…)) leftover — clampUnit (#1678 follow-up)
  - [x] `projectInitial` capsule amount가 `clampUnit` 또는 `clamp(…, 0, 1)`을 씀
  - [x] 초기 cloth contact 투영 수치 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2323](https://github.com/bichikim/web/issues/2323) Refactor: Pomo seated-pose·garment-physics getDeltaTime frame cap twin — es-toolkit/math clamp
  - [x] seated-pose·garment-physics가 `es-toolkit/math` `clamp`(또는 동일 계약 helper)로 frame delta를 캡
  - [x] maxDelta(0.1)·maxFrame(0.05) 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2327](https://github.com/bichikim/web/issues/2327) Refactor: Pomo parallax·cloth.ts frame/integrator delta Math.min leftover — es-toolkit/math clamp (#2323 follow-up)
  - [x] parallax `#renderFrame`이 `clamp(…, 0, MAXIMUM_FRAME_DURATION)` 사용
  - [x] cloth.ts `advance`가 `clamp(elapsed, 0, 1 / MIN_FRAME_RATE)` (또는 동일 계약) 사용
  - [x] 64ms / 1/15s 상한 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2328](https://github.com/bichikim/web/issues/2328) Refactor: Pomo audio-driven-viseme percentileIndex Math.max(0, Math.min(…)) leftover — es-toolkit/math clamp
  - [x] `getPeakReference` percentile index가 `es-toolkit/math` `clamp` 사용
  - [x] peak reference / envelope level 동작 동일
  - [x] 관련 lip-sync 단위 테스트 · typecheck · lint 통과

- [x] [#2337](https://github.com/bichikim/web/issues/2337) Refactor: Pomo cloth.ts displacement scale Math.min(1,…) leftover — clampUnit (#2272/#2327 follow-up)
  - [x] cloth.ts `constrain` displacement scale이 `clampUnit`을 씀
  - [x] MAX_DISPLACEMENT×mobility 상한 수치 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2338](https://github.com/bichikim/web/issues/2338) Refactor: Pomo browser-audio-viseme getDominantProfile hand-rolled max — es-toolkit/array maxBy
  - [x] `getDominantProfile`이 `es-toolkit/array` `maxBy`(또는 동등 계약)로 최댓값을 고름
  - [x] weight ≤ 0 → null · override margin 동작 동일
  - [x] 관련 lip-sync 단위 테스트 · typecheck · lint 통과

- [x] [#2357](https://github.com/bichikim/web/issues/2357) Refactor: Pomo text-mood·tiny-speech-number softmax Math.max(...array) twin — es-toolkit/math max
  - [x] 호환 구현: 설치된 `es-toolkit/math`에 `max`가 없어 공통 softmax 안에서 `es-toolkit/array`의 `maxBy`를 사용함. 원문 API 치환은 적용 불가
  - [x] temperature/logits → probability 계약 동일
  - [ ] (선택, 미적용) cloth-contact waist `Math.max(...map)`도 같은 API로
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2358](https://github.com/bichikim/web/issues/2358) Refactor: Pomo calendar NEXT_WEEK_EXCLUSION leftover — fold into createCalendarExclusionPattern (#2265/#2353 follow-up)
  - [x] `NEXT_WEEK_EXCLUSION_PATTERN`이 `#2265` factory(또는 동일 suffix helper)를 씀
  - [x] 이번 주/다음 주 제외·combined week 계약이 `#2353` 스펙과 동일
  - [x] 관련 calendar query 스펙 · lint 통과

- [x] [#2368](https://github.com/bichikim/web/issues/2368) Refactor: Pomo calendar YESTERDAY_EXCLUSION leftover — fold into createCalendarExclusionPattern (#2265/#2350 follow-up)
  - [x] `YESTERDAY_EXCLUSION_PATTERN`이 `#2265` factory(또는 동일 suffix helper)를 씀
  - [x] 어제 제외·어제+오늘 복합 계약이 `#2350` 스펙과 동일
  - [ ] (선택, 미적용) week inclusion이 phrase helper와 같은 골격
  - [x] 관련 calendar query 스펙 · lint 통과

- [x] [#2369](https://github.com/bichikim/web/issues/2369) Refactor: Pomo expense·album-translation JSON candidate scan twin — iterateJsonObjectSlices (#2354 follow-up)
  - [x] expense·album-translation이 공유 candidate-slice helper를 씀
  - [x] `#2354` expense prose/brace·skip-unrelated-JSON 스펙과 album translation JSON 스펙 유지
  - [x] invalid-shape skip 정책(expense) vs every-`{`(album) 계약이 호출부에 명시적으로 남음
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2370](https://github.com/bichikim/web/issues/2370) Refactor: Pomo expense·ai-runner local isRecord leftover — src/utils/is-object (#1504 follow-up)
  - [x] expense·ai-runner store의 object 가드가 `isObject`(또는 그걸 부르는 1줄 래퍼)를 씀
  - [x] ExpenseParseResult / runner JSON row 계약 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2395](https://github.com/bichikim/web/issues/2395) Refactor: Pomo text-mood·tiny-speech-number softmax twin — shared numericallyStableSoftmax (#2357 follow-up)
  - [x] text-mood·tiny-speech-number가 공유 numerically-stable softmax helper를 씀
  - [x] temperature/logits → probability 및 tiny-speech kind ranking 계약 동일
  - [x] (가능하면) `#2357`의 `max` 치환을 같은 helper 안에서 흡수
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2400](https://github.com/bichikim/web/issues/2400) Refactor: Pomo parallax·lip-sync exponential approach twin — shared exponentialApproachFactor
  - [x] parallax·lip-sync가 공유 `exponentialApproachFactor`를 씀
  - [x] FOLLOW/RETURN 및 ATTACK/RELEASE 시간 상수·정착 거리 계약 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2401](https://github.com/bichikim/web/issues/2401) Refactor: Pomo cosineEaseOutAlpha leftover — compose 1 - cosineEaseInOut
  - [x] `cosineEaseOutAlpha`가 `1 - cosineEaseInOut(elapsed / duration)`로 구현됨
  - [x] video-loop·video-edges fade 계약·스펙 수치 동일
  - [x] typecheck · lint 통과

- [x] [#2428](https://github.com/bichikim/web/issues/2428) Refactor: Pomo weather·feed ISO calendar-date validation twin — shared hasValidIsoCalendarDate
  - [x] ISO `YYYY-MM-DD` calendar-day validity implemented in one place
  - [x] weather expiry · feed timestamp both use it
  - [x] `#2410`/`#2418` regression specs still pass
  - [x] related unit tests · typecheck · lint pass

- [x] [#2454](https://github.com/bichikim/web/issues/2454) Refactor: Pomo sentence·streaming-speech-buffer English abbreviation twin — shared isEnglishTitleAbbreviation
  - [x] Title abbreviation catalog lives in one place
  - [x] sentence validation + streaming buffer abbreviation behavior unchanged
  - [x] related unit tests · typecheck · lint pass

- [x] [#2518](https://github.com/bichikim/web/issues/2518) Refactor: Pomo opacity-twinkle·layer-scene·blink·pupil random-in-range twin — shared randomInRange
  - [x] continuous `min + rng * (max - min)` lives in one util (plus optional travel-range adapter)
  - [x] opacity-twinkle · layer-scene · blink-scheduler · pupil delay use it
  - [x] injectable `random` contracts preserved where already present; pupil gains injectability or documents Math.random default
  - [x] related unit tests · typecheck · lint pass

- [x] [#2575](https://github.com/bichikim/web/issues/2575) Refactor: Pomo calendar group-events·prompt all-day date-key twin — shared parseAllDayDateKey
  - [x] All-day prefix → validated date/key lives in one helper (`parseAllDayDate` / `parseAllDayDateKey`)
  - [x] group-events · prompt both use it; grouping keys + prompt formatting unchanged
  - [x] related calendar specs (`group-events` · `prompt`) · typecheck · lint pass

- [x] [#2583](https://github.com/bichikim/web/issues/2583) Refactor: Pomo calendar group-events·prompt timed-interval twin → shared validator (#2575 follow-up)
  - [x] one shared timed-interval predicate/parser used by group-events + prompt timed branch
  - [x] behavior matches post-`#2566` / closed `#2245` rules (no silent drift between list grouping and prompt)
  - [x] related unit / bug-hunt specs · typecheck · lint pass

- [x] [#2599](https://github.com/bichikim/web/issues/2599) Refactor: Pomo fullwidth digit·Unicode sign normalize twin → shared paste-numeric helper (#2584/#2585 leftover)
  - [x] fullwidth digit NFKC + `＋`/`−` → ASCII 구현이 한 곳
  - [x] `parseInteger` · `convertUnit` import; `＋`/`−`/fullwidth digit 계약 동일
  - [x] 관련 unit/parse-integer specs · typecheck · lint pass

- [x] [#2600](https://github.com/bichikim/web/issues/2600) Refactor: Pomo dialogue-writer SPEECH_STYLE punctuation class leftover (#2586)
  - [x] ASCII+fullwidth speech-style punctuation class 정의가 한 곳
  - [x] formal boundary · 해보라 · 테니까가 그 class를 사용
  - [x] dialogue-writer answer specs · typecheck · lint pass

- [x] [#2601](https://github.com/bichikim/web/issues/2601) Refactor: Pomo number-speech sign class missing fullwidth plus `＋` (#2584 leftover)
  - [x] number-speech sign class(`＋` 포함) 정의가 한 곳
  - [x] INTEGER/KOREAN_INTEGER/TOKEN_START/classify NUMBER_PATTERN·hasLeadingZero가 그 source를 사용
  - [x] `＋5` 등 leading fullwidth plus가 classify/normalize 경로에서 ASCII `+`와 동일 취급
  - [x] 관련 number-speech specs · typecheck · lint pass

### 선택·컬렉션·요청

- [x] [#2326](https://github.com/bichikim/web/issues/2326) Refactor: Pomo feature-requests·admin listFeatureRequestQuerySchema twin — shared list offset query schema
  - [x] `listFeatureRequestQuerySchema`(+ offset 상한)가 한 모듈에만 정의됨
  - [x] public·admin GET이 그 스키마/파서를 공유
  - [x] offset 0…10000 계약·invalid_request 동작 동일
  - [x] 관련 테스트·typecheck·lint 통과

- [x] [#2407](https://github.com/bichikim/web/issues/2407) Refactor: Pomo background·language-learning Fisher-Yates twin — es-toolkit/array shuffle
  - [x] playlist·word-selection use `es-toolkit/array` `shuffle` (or injected `shuffle`)
  - [x] playlist no-adjacent-current swap + language-learning count range unchanged
  - [x] related unit tests · typecheck · lint pass

- [x] [#2408](https://github.com/bichikim/web/issues/2408) Refactor: Pomo user-auth·admin-auth magic-link request twin — shared requestMagicLink
  - [x] user·admin share one request helper; path pairs remain feature-owned
  - [x] existing magic-link unit tests pass (or move assertions to shared helper + thin wrappers)
  - [x] typecheck · lint pass

- [x] [#2416](https://github.com/bichikim/web/issues/2416) Refactor: Pomo delayed-end·random-event onEvent pending twin — shared runPendingEvent
  - [x] delayed-end·random-event share one pending-event runner
  - [x] `#2409` regression (no second `onEvent` while first pending) still passes
  - [x] random-event visibility / dispose clear semantics unchanged
  - [x] related unit tests · typecheck · lint pass

- [x] [#2417](https://github.com/bichikim/web/issues/2417) Refactor: Pomo select-transition·pupil Math.random index twin — es-toolkit/array sample
  - [x] select-transition·pupil use `es-toolkit/array` `sample`
  - [x] empty pool still falls back to `'fade'`; empty pupil candidates skip move
  - [x] related unit tests · typecheck · lint pass

- [x] [#2447](https://github.com/bichikim/web/issues/2447) Refactor: Pomo text-generation·chat-voice retryable lazy Promise twin — createRetryableLazyPromise
  - [x] retryable lazy Promise cache helper가 한 곳
  - [x] text-generation execution · chat-voice lazy가 그 helper를 씀
  - [x] prepare 실패 후 재시도 회귀 유지 · chat-voice load 실패 후 재시도 가능
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2455](https://github.com/bichikim/web/issues/2455) Refactor: Pomo event-playback shuffleDialogues leftover — es-toolkit/array shuffle (#2407 follow-up)
  - [x] `random-all` uses `es-toolkit/array` `shuffle` (or injected `shuffle`)
  - [x] dialogue ordering contract + catch-up cap unchanged
  - [x] related unit tests · typecheck · lint pass

- [x] [#2456](https://github.com/bichikim/web/issues/2456) Refactor: Pomo event-playback random-one leftover — es-toolkit/array sample (#2417 follow-up)
  - [x] `random-one` uses `es-toolkit/array` `sample` (or injected `sample`)
  - [x] empty dialogue list → `[]`; catch-up cap unchanged
  - [x] related unit tests · typecheck · lint pass

- [x] [#2509](https://github.com/bichikim/web/issues/2509) Refactor: Pomo language-learning use-words·use-sentences storage-change signal twin — createCollectionChangeSignal
  - [x] words·sentences hooks share one collection-change signal helper
  - [x] injectable `events` / storage options behavior unchanged
  - [x] related unit tests · typecheck · lint pass

- [x] [#2510](https://github.com/bichikim/web/issues/2510) Refactor: Pomo feature-requests·admin offset-list controller twin — createOffsetListController (#2326 follow-up)
  - [x] user·admin hooks share one offset-list controller (or shared refresh/loadMore core)
  - [x] vote-preserving refresh (user) and status update (admin) semantics unchanged
  - [x] generation race / preserve-loaded-pages behavior preserved
  - [x] related unit tests · typecheck · lint pass

- [x] [#2520](https://github.com/bichikim/web/issues/2520) Refactor: Pomo feed-request-url·connection-key owned today-in-history path twin — shared isOwnedTodayInHistoryFeedUrl
  - [x] today-in-history pathname regex + owned-origin check defined once
  - [x] `getFeedRequestUrl` · `getFeedConnectionKey` both use the shared predicates
  - [x] timezone query · public-origin rewrite · case-normalization contracts unchanged
  - [x] feed-request-url · feed-connection-key · feed-sync self-link specs still pass
  - [x] related unit tests · typecheck · lint pass

### 저장·설정

- [x] [#2215](https://github.com/bichikim/web/issues/2215) Pomo dialogue PreferenceOptions 팩토리가 3곳에 복제됨 — createPreferenceOptions
  - [x] PreferenceOptions 조립 helper가 한 곳
  - [x] 위 3 dialogue 팩토리가 그 helper를 씀 (도메인 parse/storage/default는 각 모듈 유지)
  - [x] 동작 변경 없음 / 관련 설정·preference 스펙·lint 통과

- [x] [#2219](https://github.com/bichikim/web/issues/2219) Pomo dialogue 설정 pendingSaves·settleSave 큐가 Automatic·volume-ducking에 복제됨 — createPreferenceSaveQueue
  - [x] pendingSaves/settleSave/commit·fail 롤백 계약이 한 helper
  - [x] AutomaticSettings · use-volume-ducking이 그 helper를 씀 (도메인 equal/메시지/debounce는 각 사이트)
  - [x] 동작 변경 없음 / 관련 설정 스펙·lint 통과

- [x] [#2226](https://github.com/bichikim/web/issues/2226) Pomo Toss/web 런타임 storage 어댑터가 여러 feature에 복제됨 — createTossWebStorageAdapter (#2190 leftover)
  - [x] key-parameterized / key-bound Toss·web 어댑터 조립이 공유 factory
  - [x] 위 call sites가 그 factory를 씀 (도메인 key·parse·repository 정책은 각 모듈)
  - [x] writeWeb throw vs return-error · removeWeb 옵션이 기존 계약과 동일
  - [x] 관련 storage 스펙·typecheck·lint 통과

- [x] [#2227](https://github.com/bichikim/web/issues/2227) Pomo display-theme·screen-saver LWW 저장 오케스트레이션이 복제됨 — createTimestampedDualRuntimePreferenceRepository (#2190 leftover)
  - [x] display-theme·screen-saver LWW read/write 오케스트레이션이 공유 factory
  - [x] Toss/web 조율·revision·legacy string→`savedAt:0`·soft native/removeWeb 동작 동일
  - [x] 관련 storage·runtime 스펙 / typecheck / lint 통과

- [x] [#2233](https://github.com/bichikim/web/issues/2233) Pomo automatic-dialogue-settings가 globalThis.localStorage에만 묶임 — dual runtime 마이그레이션 (#2226/#2215 leftover)
  - [x] automatic-dialogue 설정이 Toss/web dual runtime repository를 씀
  - [x] PreferenceOptions / createParsedPreferenceStorage 계약 유지 (async ok)
  - [x] 웹 저장소와 Toss Storage 모의 어댑터에서 동일 키로 복원·저장 검증; 실제 Toss 기기 검증은 별도
  - [x] AutomaticSettings·reminders·관련 스펙 / typecheck / lint 통과

- [x] [#2234](https://github.com/bichikim/web/issues/2234) Pomo scene-preferences가 createAuthoritativePreferenceRepository를 우회함 — soft-native + failure-marker leftover
  - [x] scene-preferences dual-runtime 오케스트레이션이 shared authoritative factory(+ soft/marker 옵션)를 씀
  - [x] soft native fail · failure-marker · pending-write 중 web 우선 · native mirror 계약이 #1615/#2034와 동일
  - [x] 관련 scene storage 스펙·typecheck·lint 통과

### Worker·미디어

- [x] [#2220](https://github.com/bichikim/web/issues/2220) Pomo image-model-download onFailure가 createWorkerFailureHandler를 우회함 — (#1492 leftover)
  - [x] image-model-download onFailure가 shared helper를 씀
  - [x] message-error / fallback detail / reportClientError 계약 유지
  - [x] 관련 단위 테스트·typecheck·lint 통과

- [x] [#2271](https://github.com/bichikim/web/issues/2271) Refactor: Pomo language-learning batch·SoundPlayerPage create-only Object URL — replaceBlobObjectUrl (#2015/#2049 leftover)
  - [x] batch generate·SoundPlayerPage create/dispose가 `replaceBlobObjectUrl`(또는 `replaceObjectUrl`)를 씀
  - [x] `revokeLanguageLearningAudioUrls`가 손수 `revokeObjectURL`을 쓰지 않거나 제거됨
  - [x] leak 없음 · regenerate·batch failure revoke 계약 유지
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2276](https://github.com/bichikim/web/issues/2276) Refactor: Pomo calendar Google·Microsoft listEvents flatten·EVENT_REQUEST_CONCURRENCY leftover — aggregateProviderEvents (#1420 follow-up)
  - [x] `EVENT_REQUEST_CONCURRENCY`가 한곳에만 정의됨
  - [x] Google·Microsoft `listEvents` flatten/truncated/unavailable 집계가 공유 helper를 씀
  - [x] provider-specific normalize·Graph timezone·composite ID 계약 유지
  - [x] 관련 calendar provider 단위 테스트 · typecheck · lint 통과

- [x] [#2290](https://github.com/bichikim/web/issues/2290) Refactor: Pomo speech·text-mood RPC client createCancelledError·createWorkerError 복제 — worker-rpc phase error helpers
  - [x] speech·text-mood의 cancelled/worker-failed 팩토리·disposed 매핑·disposed-skip reporter가 공유 helper를 씀
  - [x] SpeechRecognitionError / TextMoodError phase·code 계약 유지
  - [x] prepare/transcribe·prepare/analyze busy·dispose 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2309](https://github.com/bichikim/web/issues/2309) Refactor: Pomo calendar Google·Microsoft createTokenBody·exchangeCode·refreshTokens 복제 — OAuth token methods (#2276 leftover)
  - [x] Google·Microsoft의 `createTokenBody` / `exchangeCode` / `refreshTokens`가 공유 helper를 씀
  - [x] MS `scope`·token URL·refreshToken fallback 계약 유지
  - [x] provider-specific authorize URL·account·normalize 계약 유지
  - [x] 관련 calendar provider 단위 테스트 · typecheck · lint 통과

- [x] [#2315](https://github.com/bichikim/web/issues/2315) Refactor: Pomo image-generation runWorker·opus createOpusBlob one-shot Worker Promise 복제 — createOneShotWorkerRequest (#1492 OOS leftover)
  - [x] image-generation `runWorker`와 opus `createOpusBlob`가 공유 one-shot helper를 씀
  - [x] abort / error / messageerror / terminate-once 계약 유지
  - [x] progress 중간 메시지·transfer·도메인 응답 매핑 유지
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2316](https://github.com/bichikim/web/issues/2316) Refactor: Pomo useSoundGeneration·useSoundJoining busy·Worker·BlobURL 훅 복제 — createOneShotSoundWorkerController
  - [x] generation·joining이 공유 controller로 busy/status/error/url·Worker·cleanup을 씀
  - [x] joining의 decode/prepare/assemble 도메인 계약 유지
  - [x] stop / busy re-entry / result URL 교체 / cleanup revoke 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2446](https://github.com/bichikim/web/issues/2446) Refactor: Pomo tour-audio·video-sample·Library HTMLMedia pause·src unload twin — clearHtmlMediaElement
  - [x] pause/removeAttribute/load 계약이 한 helper
  - [x] 위 4–5 call site가 그 helper를 씀
  - [x] tour stop / sample cancel / Library stop / preview reset 동작 동일
  - [x] 관련 단위 테스트 · typecheck · lint 통과

- [x] [#2511](https://github.com/bichikim/web/issues/2511) Refactor: Pomo admin-music·custom-albums square WebP cover encode twin — shared encodeSquareWebpCover
  - [x] square WebP canvas encode lives in one place
  - [x] centered square crop helper shared by admin prepare + custom embedded cover
  - [x] admin validate/edge/quality and custom size-cap retry / error codes unchanged
  - [x] related unit tests · typecheck · lint pass

- [x] [#2519](https://github.com/bichikim/web/issues/2519) Refactor: Pomo custom-albums track Object URL cache·duration reader — replaceBlobObjectUrl (#2481 leftover)
  - [x] `toCustomPTrack` / `revokeCustomTrackObjectUrls` create·dispose via `replaceBlobObjectUrl` (Map cache kept)
  - [x] `readAudioDuration` ephemeral URL create·dispose via the same helper
  - [x] cache reuse · revoke-on-remove · invalid-audio error contracts unchanged
  - [x] related unit tests · typecheck · lint pass

- [x] [#2543](https://github.com/bichikim/web/issues/2543) Refactor: Pomo daylight-tilt·relax-depth-motion DeviceOrientation permission twin — requestDeviceOrientationPermission
  - [x] availability + `requestPermission` live in one `device-orientation` export
  - [x] daylight-tilt · relax-depth-motion hooks use it; status/`requestVersion` contracts preserved
  - [x] Parallax `MotionEnvironment` path unchanged (or documented OOS)
  - [x] related unit tests · typecheck · lint pass

### 렌더링

- [x] [#2339](https://github.com/bichikim/web/issues/2339) Refactor: Pomo falling-streaks·falling-flakes masked ParticleContainer scaffolding twin — createMaskedParticleEffect
  - [x] mask + ParticleContainer + setAnimationEnabled + destroy 골격이 한 모듈에만 정의됨
  - [x] streaks/flakes가 그 factory를 공유하고 advance·depth 튜닝은 유지
  - [x] 시각/단위 테스트 · typecheck · lint 통과

- [x] [#2544](https://github.com/bichikim/web/issues/2544) Refactor: Pomo relax-depth-motion exponential approach leftover — exponentialApproachFactor (#2400 follow-up)
  - [x] `createDepthOffsetSmoother` uses shared `exponentialApproachFactor`
  - [x] FOLLOW_TIME_CONSTANT / settle / reduced-motion behavior unchanged
  - [x] related unit tests · typecheck · lint pass

- [x] [#2545](https://github.com/bichikim/web/issues/2545) Refactor: Pomo glass-light-filter fullscreen vertex leftover — import FULLSCREEN_VERTEX
  - [x] only `fullscreen-vertex.ts` owns the fullscreen vertex GLSL string
  - [x] glass-light · rain · droplet-erase · mist-evolution all import it
  - [x] related tests · typecheck · lint pass

- [x] [#2557](https://github.com/bichikim/web/issues/2557) Refactor: Pomo glass-light·rain coverUv GLSL twin — shared COVER_UV (#2545 follow-up)
  - [x] one exported GLSL snippet owns `coverUv(vec2, vec2, float)`
  - [x] glass-light · rain interpolate it; rain centered calls use alignment `0.5`
  - [x] cover / mobile-alignment / compact-landscape visual contracts unchanged
  - [x] related tests · typecheck · lint pass

- [x] [#2558](https://github.com/bichikim/web/issues/2558) Refactor: Pomo frame-renderer ScreenEffect fullscreen vertex leftover — share FULLSCREEN_VERTEX (#2545)
  - [x] one module owns the `vUv = aPosition` fullscreen vertex string
  - [x] relax-glass filters · `ScreenEffect` import it (glass-light via `#2545` or this PR)
  - [x] album transition / glass filter construction unchanged
  - [x] related tests · typecheck · lint pass

- [x] [#2559](https://github.com/bichikim/web/issues/2559) Refactor: Pomo steam·mouth Hermite smoothStep twin — shared smoothStep util
  - [x] Hermite `t²(3−2t)` lives in one util (+ optional clampUnit wrapper)
  - [x] steam-particle · mouth-transition use it; opacity / rise / viseme crossfade numbers unchanged
  - [x] related unit tests · typecheck · lint pass

- [x] [#2573](https://github.com/bichikim/web/issues/2573) Refactor: Pomo mist·droplet rain-map eraser GLSL twin — shared RAIN_MAP_ERASER
  - [x] Rain-map eraser edge lives in one exported GLSL snippet
  - [x] mist-evolution · droplet-erase both use it; wipe visuals unchanged
  - [x] related unit/render tests · typecheck · lint pass

- [x] [#2574](https://github.com/bichikim/web/issues/2574) Refactor: Pomo focus·relax depthResponse GLSL twin — shared DEPTH_RESPONSE
  - [x] Piecewise depthResponse curve (and shared `1.0, 0.35` axis scale if extracted) lives in one export
  - [x] relax depth-shader · focus depth-parallax-filter both use it; parallax numbers unchanged
  - [x] related filter/spec tests · typecheck · lint pass

- [x] [#2581](https://github.com/bichikim/web/issues/2581) Refactor: Pomo focus-room FILTER_VERTEX twin — shared filter vertex (+ scene UV)
  - [x] focus-room filter NDC + `vTextureCoord` (and shared scene UV) live in one/two exports
  - [x] layer-mask · masked-pixel-push · depth-parallax · pixel-push import them; filter visuals unchanged
  - [x] related unit/render tests · typecheck · lint pass

- [x] [#2582](https://github.com/bichikim/web/issues/2582) Refactor: Pomo background playlist `[...new Set]` → es-toolkit `uniq` (#1505 leftover)
  - [x] both playlist Set-spreads use `uniq` from `es-toolkit/array`
  - [x] playlist unit tests · typecheck · lint pass
  - [x] no new `[...new Set(` under `apps/pomo/src` for array dedupe (or document intentional leftovers)

### 테스트 실행 경계·헬퍼

- [x] [#2174](https://github.com/bichikim/web/issues/2174) Pomo 테스트 createDeferred가 20+ 스펙에 복제됨 — Promise.withResolvers 공유 헬퍼
  - [x] deferred 헬퍼가 한 곳 (또는 인라인 `Promise.withResolvers`로 통일)
  - [x] 로컬 `createDeferred` 복제 제거
  - [x] 동작 변경 없음 / 관련 테스트·lint 통과

- [x] [#2175](https://github.com/bichikim/web/issues/2175) Pomo ai-runner index.spec이 unit에서 실 TCP listen·mkdtemp를 씀 — mock 또는 integration 분리 (#1946 follow-up)
  - [x] unit 스위트에서 실 `listen(0)` / 실 `mkdtemp`가 제거되거나 slow suite로 분리됨
  - [x] EADDRINUSE·shutdown 계약은 mock 또는 integration으로 유지
  - [x] tests / typecheck / lint 통과

- [x] [#2213](https://github.com/bichikim/web/issues/2213) Pomo polyfills.spec이 unit에서 실 Vite build·mkdtemp·listen을 씀 — mock 또는 integration 분리
  - [x] unit 스위트에서 실 Vite listen·mkdtemp·풀 빌드가 사라지거나 integration으로만 실행
  - [x] Promise.withResolvers polyfill / server non-polyfill / dep prebundle 계약은 유지
  - [x] 관련 lint·테스트 통과

- [x] [#2221](https://github.com/bichikim/web/issues/2221) Pomo vite transform-cache·prune·steam-assets 스펙이 unit에서 실 mkdtemp FS를 씀 — mock 또는 integration 분리
  - [x] unit 스위트에서 위 스펙의 실 mkdtemp artifact I/O가 제거되거나 slow suite로 분리
  - [x] 캐시 hit/invalidation·prune·steam validate 계약 유지
  - [x] tests / typecheck / lint 통과

- [x] [#2267](https://github.com/bichikim/web/issues/2267) Pomo chat worker.spec이 unit에서 resetModules·실 worker 모듈 재import로 30s timeout을 씀 — 추출 mock 또는 integration 분리 (#2248 leftover)
  - [x] unit 경로에서 30s worker-import timeout이 사라지거나 integration으로만 실행
  - [x] compaction / completed-context tokens(#2248) / generate guard 계약 유지
  - [x] 관련 lint·테스트 통과

- [x] [#2277](https://github.com/bichikim/web/issues/2277) Pomo dialogue-writer·text-mood·speech·album-translation worker.spec이 unit에서 resetModules·실 worker 재import — mock 또는 integration (#2267 follow-up)
  - [x] dialogue-writer·text-mood·speech-to-text·album-translation unit 경로에서 per-test 실 worker `resetModules` reimport가 제거되거나 integration으로만 실행
  - [x] prepare / generate·transcribe / overlap guard 계약 유지
  - [x] (선택) supertonic·text-worker peers도 같은 기준으로 정리
  - [x] 관련 lint·테스트 통과

- [x] [#2282](https://github.com/bichikim/web/issues/2282) Pomo sound-generation·image-generation worker.spec이 unit에서 resetModules·실 worker 재import — mock 또는 integration (#2277 follow-up)
  - [x] sound-generation·image-generation unit 경로에서 per-test 실 worker `resetModules` reimport가 제거되거나 integration으로만 실행
  - [x] progress/result · overlap guard · loop routing · prompt/image/prepare-image 계약 유지
  - [x] (선택) `#2277` Optional peers(supertonic·opus·text-worker)도 같은 기준으로 정리
  - [x] 관련 lint·테스트 통과

- [x] [#2287](https://github.com/bichikim/web/issues/2287) Pomo supertonic·opus·text-worker worker.spec이 unit에서 resetModules·실 worker 재import — mock 또는 integration (#2282/#2277 follow-up)
  - [x] supertonic(worker·generation·download-failures)·opus-worker·text-worker unit 경로에서 per-test 실 worker `resetModules` reimport가 제거되거나 integration으로만 실행
  - [x] initialize/progress · generate/cancel · download failure · opus encode · text prepare 계약 유지
  - [ ] (선택, 미적용) supertonic 삼중 harness 복제 제거
  - [x] 관련 lint·테스트 통과

- [x] [#2429](https://github.com/bichikim/web/issues/2429) Refactor: Pomo TestBroadcastChannel mock twin — shared createTestBroadcastChannel
  - [x] `TestBroadcastChannel`(또는 동등 factory) 구현이 한 곳
  - [x] 7개 스펙 local class 제거
  - [x] `#2422` tab-sync · desktop music/scene/mode BroadcastChannel 스펙 통과
  - [x] related unit tests · lint 통과

## 실행 결과

79개 모두 구현 대상과 현재 코드의 일치 여부를 확인했다. 77개는 원래 요구의 공통화·호출부 전환을 적용했고, #2357은 존재하는 라이브러리 API로 구현했다. #2266은 선행 수정으로 분기가 제거된 상태여서 기존 동작을 유지했다. 체크는 로컬 구현·명시한 검증 범위를 뜻하며 GitHub 이슈 종료를 뜻하지 않는다. 선택 조건 중 추가 허리 최댓값 치환, inclusion 골격 추출, Supertonic 삼중 harness 통합은 적용하지 않았다.

### 조정과 동작 보존

- #2266: `72f411d0b`, `9598b410b`, `9c2d8cb40`에서 오늘·내일 알림을 저장 시점에 계산하고 선택 날짜를 자정 이후에도 보존하도록 정리했다. 이번에 edit-opened 기준을 되살리면 선행 버그 수정이 깨지므로 기존 공통 `resolveReminderAt`을 유지했다. reminder-draft·MemoItem·memo-creator의 자정 경과 테스트가 전체 단위 실행에 포함됐다.
- #2357/#2395: 설치된 es-toolkit의 `dist/math/index.d.ts`는 `max`를 내보내지 않는다. `maxBy`로 최댓값을 고르는 공통 softmax로 구현했으며 확률·순위 회귀 테스트가 통과했다.
- #2407/#2455/#2456: 기본 난수는 es-toolkit의 shuffle/sample을 사용한다. 주입 난수는 공통 어댑터가 맡는다. es-toolkit에는 난수 인자가 없으므로 기존 결정적 순서와 `random() === 1` 경계를 유지하는 데 필요한 작은 구현만 남겼다. 기존 멤버십 확인용 Set은 배열 중복 제거와 역할이 달라 유지했다.
- #2369: 앨범 변환의 마지막 유효 JSON 선택, expense의 유효 형태가 아니면 다음 객체로 진행하는 정책을 각 호출부에 남겼다.
- #2233: automatic-dialogue의 브라우저 전용 저장을 dual runtime으로 옮겼다. 비동기 초기 복원이 feed 초기 동기화를 두 번 실행하지 않도록 최초 null→설정 복원을 별도로 처리했다. 이후 설정 변경 갱신은 유지했다.
- #2583: timed interval은 명시적 ISO offset과 `end > start`를 공통으로 검증한다. 이전 prompt의 엄격한 규칙에 grouping도 맞췄다. 시작=종료인 navigation 테스트 데이터는 유효한 한 시간 일정으로 고쳤고 캐시 표시·탭 전환의 원래 assertion을 유지했다.
- #2234: scene의 soft native 실패, failure marker, pending write 우선순위는 shared authoritative factory 옵션으로 옮겼다. 기본 factory의 실패 정책과 합치지 않았다.

### 번호별 구현 증거

아래 위치와 위 체크 항목을 함께 확인한다. 각 위치의 관련 단위 테스트는 전체 실행에 포함되어 있고, 실제 Worker·FS·TCP 테스트는 integration 실행 결과에 포함된다.

| 이슈                                                 | 상태           | 구현 위치                                                                                                                                                                                                                     |
| ---------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#2193](https://github.com/bichikim/web/issues/2193) | 적용           | [src/utils/normalize-pathname/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/normalize-pathname/index.ts:2)                                                                                            |
| [#2214](https://github.com/bichikim/web/issues/2214) | 적용           | [src/features/civil-date/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/civil-date/index.ts:43)                                                                                                     |
| [#2232](https://github.com/bichikim/web/issues/2232) | 적용           | [src/features/tools/calculate-service.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/tools/calculate-service.ts:1)                                                                                        |
| [#2265](https://github.com/bichikim/web/issues/2265) | 적용           | [src/features/calendar/create-calendar-exclusion-pattern.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/calendar/create-calendar-exclusion-pattern.ts:4)                                                  |
| [#2266](https://github.com/bichikim/web/issues/2266) | 선행 해결 확인 | [src/components/memory-assist/reminder-draft.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/components/memory-assist/reminder-draft.ts:21)                                                                         |
| [#2272](https://github.com/bichikim/web/issues/2272) | 적용           | [src/features/sound-joining/audio.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/sound-joining/audio.ts:85)                                                                                               |
| [#2291](https://github.com/bichikim/web/issues/2291) | 적용           | [src/features/focus-room-animation/steam-particle-system.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/focus-room-animation/steam-particle-system.ts:31)                                                 |
| [#2310](https://github.com/bichikim/web/issues/2310) | 적용           | [src/features/download-progress/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/download-progress/index.ts:7)                                                                                        |
| [#2314](https://github.com/bichikim/web/issues/2314) | 적용           | [src/features/supertonic/number-speech/classify-tiny-speech-number.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/supertonic/number-speech/classify-tiny-speech-number.ts:60)                             |
| [#2321](https://github.com/bichikim/web/issues/2321) | 적용           | [src/utils/resolve-pointer-gesture-axis/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/resolve-pointer-gesture-axis/index.ts:9)                                                                        |
| [#2322](https://github.com/bichikim/web/issues/2322) | 적용           | [src/components/character-studio/cloth-contact.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/components/character-studio/cloth-contact.ts:169)                                                                    |
| [#2323](https://github.com/bichikim/web/issues/2323) | 적용           | [src/components/character-studio/garment-physics.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/components/character-studio/garment-physics.ts:25)                                                                 |
| [#2327](https://github.com/bichikim/web/issues/2327) | 적용           | [src/features/focus-room-animation/parallax-controller.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/focus-room-animation/parallax-controller.ts:25)                                                     |
| [#2328](https://github.com/bichikim/web/issues/2328) | 적용           | [src/features/lip-sync/audio-driven-viseme.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/lip-sync/audio-driven-viseme.ts:57)                                                                             |
| [#2337](https://github.com/bichikim/web/issues/2337) | 적용           | [src/components/character-studio/cloth.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/components/character-studio/cloth.ts:108)                                                                                    |
| [#2338](https://github.com/bichikim/web/issues/2338) | 적용           | [src/features/lip-sync/browser-audio-viseme.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/lip-sync/browser-audio-viseme.ts:56)                                                                           |
| [#2357](https://github.com/bichikim/web/issues/2357) | API 대체 구현  | [src/utils/numerically-stable-softmax/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/numerically-stable-softmax/index.ts:4)                                                                            |
| [#2395](https://github.com/bichikim/web/issues/2395) | 적용           | [src/utils/numerically-stable-softmax/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/numerically-stable-softmax/index.ts:4)                                                                            |
| [#2358](https://github.com/bichikim/web/issues/2358) | 적용           | [src/features/calendar/query.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/calendar/query.ts:10)                                                                                                         |
| [#2368](https://github.com/bichikim/web/issues/2368) | 적용           | [src/features/calendar/query.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/calendar/query.ts:20)                                                                                                         |
| [#2369](https://github.com/bichikim/web/issues/2369) | 적용           | [src/utils/json/iterate-json-object-slices.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/json/iterate-json-object-slices.ts:2)                                                                              |
| [#2370](https://github.com/bichikim/web/issues/2370) | 적용           | [src/server/ai-runner/store.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/server/ai-runner/store.ts:51)                                                                                                           |
| [#2400](https://github.com/bichikim/web/issues/2400) | 적용           | [src/utils/exponential-approach-factor/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/exponential-approach-factor/index.ts:2)                                                                          |
| [#2401](https://github.com/bichikim/web/issues/2401) | 적용           | [src/features/frame-renderer/cosine-ease-out-alpha.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/frame-renderer/cosine-ease-out-alpha.ts:3)                                                              |
| [#2428](https://github.com/bichikim/web/issues/2428) | 적용           | [src/utils/iso-calendar-date/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/iso-calendar-date/index.ts:2)                                                                                              |
| [#2454](https://github.com/bichikim/web/issues/2454) | 적용           | [src/utils/english-title-abbreviation/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/english-title-abbreviation/index.ts:1)                                                                            |
| [#2518](https://github.com/bichikim/web/issues/2518) | 적용           | [src/utils/random-in-range/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/random-in-range/index.ts:2)                                                                                                  |
| [#2575](https://github.com/bichikim/web/issues/2575) | 적용           | [src/features/calendar/all-day-date.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/calendar/all-day-date.ts:5)                                                                                            |
| [#2583](https://github.com/bichikim/web/issues/2583) | 적용           | [src/features/calendar/parse-timed-interval.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/calendar/parse-timed-interval.ts:8)                                                                            |
| [#2599](https://github.com/bichikim/web/issues/2599) | 적용           | [src/utils/normalize-paste-numeric-input/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/normalize-paste-numeric-input/index.ts:2)                                                                      |
| [#2600](https://github.com/bichikim/web/issues/2600) | 적용           | [src/features/dialogue-writer/answer.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/dialogue-writer/answer.ts:1)                                                                                          |
| [#2601](https://github.com/bichikim/web/issues/2601) | 적용           | [src/features/supertonic/number-speech/number-patterns.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/supertonic/number-speech/number-patterns.ts:1)                                                      |
| [#2326](https://github.com/bichikim/web/issues/2326) | 적용           | [src/server/http/list-offset-query-schema.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/server/http/list-offset-query-schema.ts:3)                                                                                |
| [#2407](https://github.com/bichikim/web/issues/2407) | 적용           | [src/utils/shuffle-with-random/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/shuffle-with-random/index.ts:5)                                                                                          |
| [#2408](https://github.com/bichikim/web/issues/2408) | 적용           | [src/features/magic-link/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/magic-link/index.ts:8)                                                                                                      |
| [#2416](https://github.com/bichikim/web/issues/2416) | 적용           | [src/features/focus-room-dialogue/run-pending-event.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/focus-room-dialogue/run-pending-event.ts:7)                                                            |
| [#2417](https://github.com/bichikim/web/issues/2417) | 적용           | [src/features/background/select-transition.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/background/select-transition.ts:5)                                                                              |
| [#2447](https://github.com/bichikim/web/issues/2447) | 적용           | [src/utils/create-retryable-lazy-promise/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/create-retryable-lazy-promise/index.ts:2)                                                                      |
| [#2455](https://github.com/bichikim/web/issues/2455) | 적용           | [src/features/focus-room-dialogue/event-playback.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/focus-room-dialogue/event-playback.ts:53)                                                                 |
| [#2456](https://github.com/bichikim/web/issues/2456) | 적용           | [src/utils/sample-with-random/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/sample-with-random/index.ts:5)                                                                                            |
| [#2509](https://github.com/bichikim/web/issues/2509) | 적용           | [src/features/value-storage/create-collection-change-signal.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/value-storage/create-collection-change-signal.ts:8)                                            |
| [#2510](https://github.com/bichikim/web/issues/2510) | 적용           | [src/features/feature-requests/create-offset-list-controller.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/feature-requests/create-offset-list-controller.ts:31)                                         |
| [#2520](https://github.com/bichikim/web/issues/2520) | 적용           | [src/features/focus-room-feed/is-owned-today-in-history-feed-url.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/focus-room-feed/is-owned-today-in-history-feed-url.ts:2)                                  |
| [#2215](https://github.com/bichikim/web/issues/2215) | 적용           | [src/features/preference-options/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/preference-options/index.ts:4)                                                                                      |
| [#2219](https://github.com/bichikim/web/issues/2219) | 적용           | [src/features/preference-save-queue/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/preference-save-queue/index.ts:6)                                                                                |
| [#2226](https://github.com/bichikim/web/issues/2226) | 적용           | [src/utils/runtime-storage/create-toss-web-storage-adapter.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/runtime-storage/create-toss-web-storage-adapter.ts:13)                                             |
| [#2227](https://github.com/bichikim/web/issues/2227) | 적용           | [src/utils/runtime-storage/create-timestamped-dual-runtime-preference-repository.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/runtime-storage/create-timestamped-dual-runtime-preference-repository.ts:43) |
| [#2233](https://github.com/bichikim/web/issues/2233) | 적용           | [src/features/focus-room-dialogue/automatic-dialogue-settings.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/focus-room-dialogue/automatic-dialogue-settings.ts:54)                                       |
| [#2234](https://github.com/bichikim/web/issues/2234) | 적용           | [src/features/authoritative-preference/create-soft-native-preference-repository.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/authoritative-preference/create-soft-native-preference-repository.ts:3)    |
| [#2220](https://github.com/bichikim/web/issues/2220) | 적용           | [src/features/model-download/image-client.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/model-download/image-client.ts:20)                                                                               |
| [#2271](https://github.com/bichikim/web/issues/2271) | 적용           | [src/components/language-learning/voice-generation.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/components/language-learning/voice-generation.ts:96)                                                             |
| [#2276](https://github.com/bichikim/web/issues/2276) | 적용           | [src/server/calendar/providers/aggregate-provider-events.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/server/calendar/providers/aggregate-provider-events.ts:10)                                                 |
| [#2290](https://github.com/bichikim/web/issues/2290) | 적용           | [src/features/worker-rpc/phase-errors.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/worker-rpc/phase-errors.ts:2)                                                                                        |
| [#2309](https://github.com/bichikim/web/issues/2309) | 적용           | [src/server/calendar/providers/create-oauth-token-methods.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/server/calendar/providers/create-oauth-token-methods.ts:13)                                               |
| [#2315](https://github.com/bichikim/web/issues/2315) | 적용           | [src/utils/worker-transport/create-one-shot-worker-request.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/worker-transport/create-one-shot-worker-request.ts:17)                                             |
| [#2316](https://github.com/bichikim/web/issues/2316) | 적용           | [src/features/sound-worker-controller/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/sound-worker-controller/index.ts:68)                                                                           |
| [#2446](https://github.com/bichikim/web/issues/2446) | 적용           | [src/utils/clear-html-media-element/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/clear-html-media-element/index.ts:8)                                                                                |
| [#2511](https://github.com/bichikim/web/issues/2511) | 적용           | [src/utils/square-webp-cover/create-square-webp-encoder.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/square-webp-cover/create-square-webp-encoder.ts:12)                                                   |
| [#2519](https://github.com/bichikim/web/issues/2519) | 적용           | [src/features/custom-albums/to-custom-p-track.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/custom-albums/to-custom-p-track.ts:7)                                                                        |
| [#2543](https://github.com/bichikim/web/issues/2543) | 적용           | [src/features/device-orientation/request-device-orientation-permission.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/device-orientation/request-device-orientation-permission.ts:2)                      |
| [#2339](https://github.com/bichikim/web/issues/2339) | 적용           | [src/features/focus-room-animation/create-masked-particle-effect.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/focus-room-animation/create-masked-particle-effect.ts:9)                                  |
| [#2544](https://github.com/bichikim/web/issues/2544) | 적용           | [src/components/p-relax-player-page/use-relax-depth-motion.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/components/p-relax-player-page/use-relax-depth-motion.ts:44)                                             |
| [#2545](https://github.com/bichikim/web/issues/2545) | 적용           | [src/utils/fullscreen-vertex/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/fullscreen-vertex/index.ts:1)                                                                                              |
| [#2557](https://github.com/bichikim/web/issues/2557) | 적용           | [src/features/relax-glass-renderer/cover-uv.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/relax-glass-renderer/cover-uv.ts:1)                                                                            |
| [#2558](https://github.com/bichikim/web/issues/2558) | 적용           | [src/features/frame-renderer/effect.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/frame-renderer/effect.ts:83)                                                                                           |
| [#2559](https://github.com/bichikim/web/issues/2559) | 적용           | [src/utils/smooth-step/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/smooth-step/index.ts:4)                                                                                                          |
| [#2573](https://github.com/bichikim/web/issues/2573) | 적용           | [src/features/relax-glass-renderer/rain-map-eraser.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/relax-glass-renderer/rain-map-eraser.ts:1)                                                              |
| [#2574](https://github.com/bichikim/web/issues/2574) | 적용           | [src/utils/depth-response/index.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/utils/depth-response/index.ts:1)                                                                                                    |
| [#2581](https://github.com/bichikim/web/issues/2581) | 적용           | [src/features/focus-room-animation/filter-vertex.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/focus-room-animation/filter-vertex.ts:9)                                                                  |
| [#2582](https://github.com/bichikim/web/issues/2582) | 적용           | [src/features/background/playlist.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/background/playlist.ts:47)                                                                                               |
| [#2174](https://github.com/bichikim/web/issues/2174) | 적용           | [src/test-utils/create-deferred.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/test-utils/create-deferred.ts:2)                                                                                                    |
| [#2175](https://github.com/bichikim/web/issues/2175) | 적용           | [src/server/ai-runner/**tests**/index.integration.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/server/ai-runner/__tests__/index.integration.ts:68)                                                               |
| [#2213](https://github.com/bichikim/web/issues/2213) | 적용           | [**tests**/build/polyfills.integration.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/__tests__/build/polyfills.integration.ts:55)                                                                                     |
| [#2221](https://github.com/bichikim/web/issues/2221) | 적용           | [scripts/vite/**tests**/transform-cache.integration.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/scripts/vite/__tests__/transform-cache.integration.ts:15)                                                           |
| [#2267](https://github.com/bichikim/web/issues/2267) | 적용           | [src/features/chat/**tests**/worker.lifecycle.integration.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/chat/__tests__/worker.lifecycle.integration.ts:186)                                              |
| [#2277](https://github.com/bichikim/web/issues/2277) | 적용           | [src/features/dialogue-writer/**tests**/worker.integration.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/dialogue-writer/__tests__/worker.integration.ts:156)                                            |
| [#2282](https://github.com/bichikim/web/issues/2282) | 적용           | [src/features/image-generation/**tests**/worker.lifecycle.integration.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/image-generation/__tests__/worker.lifecycle.integration.ts:36)                       |
| [#2287](https://github.com/bichikim/web/issues/2287) | 적용           | [src/features/supertonic/**tests**/worker.integration.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/features/supertonic/__tests__/worker.integration.ts:236)                                                      |
| [#2429](https://github.com/bichikim/web/issues/2429) | 적용           | [src/test-utils/create-test-broadcast-channel.ts ](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/src/test-utils/create-test-broadcast-channel.ts:8)                                                                        |

### 최초 구현 검증 결과

실행 명령과 파일별 테스트 수, 번호별 구현 위치, WebGL 수치 비교는 [검증 기록](./refactoring-verification.json)에 저장했다.

- 단위: `NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run --project=unit apps/pomo --reporter=default` — 1,283개 파일 / 8,480개 테스트 모두 통과. 경로 필터가 함께 선택한 Pomo audio gateway 6개 파일 / 70개를 제외하면 Pomo는 1,277개 파일 / 8,410개다.
- 전체 실행 이후 sample fallback·text-mood 오류 매핑·canvas mock 타입 정리: 관련 15개 파일 / 99개 단위 테스트 통과.
- 통합: `NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run --config vitest.integration.config.mts --project=integration apps/pomo/ --reporter=default` — 56개 파일 통과, 1개 파일 실패; 테스트 286개 통과, 1개 실패. 이번에 integration으로 옮긴 17개 파일 / 160개 테스트는 모두 통과했고 기존 assertion을 유지했다.
- 남은 통합 실패: PMusicPlayerContent.queue-restoration의 “should stop restored playback before clearing every loaded track”. 저장 위치 기대값은 22초, 관찰값은 0초다. 실제 테스트 로더에 HEAD의 변경 전 production 소스를 주입해도 같은 실패(19개 통과·1개 실패)가 재현되어 이번 공통화와 분리했다. 관련 없는 playback 변경은 포함하지 않았다.
- 실제 브라우저 WebGL: 데스크톱(128×96), 세로(96×128), 좁은 가로(128×40)의 필터 36개 + 입자 30개 비교. 65개는 RGBA가 완전히 동일했다. 데스크톱 rain의 49,152개 채널 중 3개만 최대 1/255 차이였다. 입자는 초기·advance·reset·숨김·재개를 비교했고 destroy 반복과 destroy 이후 advance도 예외 없이 실행했다. 합성 텍스처에 대한 독립 렌더 검증이며 전체 앱 화면 검증을 대신하지 않는다.
- Pomo 타입 검사 통과. 저장소 `pnpm lint` 오류 0개; 기존 PPomodoroDurationEditor prefer-destructuring 경고 3개는 변경하지 않았다.
- `pnpm format`, `pnpm format:check`, `git diff --check` 통과. 변경 후 graft graph를 다시 생성했다.

### 검증 한계와 원격 상태

최초 전체 Pomo SSR 서버 검사는 `@paraglide/runtime` 해석 오류로 페이지를 렌더하지 못했다. 2026-10-01에 새로 시작한 [3100 개발 서버](http://localhost:3100/)는 HTTP 200과 실제 인앱 브라우저의 장면·포모도로·음악 플레이어 렌더링을 확인했고 첫 화면 관찰 시 error-level console log는 비어 있었다. 이후 확인된 ResizeObserver 오류와 캘린더 client ID 누락은 검토 기록에 별도로 남겼다. 위 독립 WebGL 비교와 실제 앱 기본 화면 검증의 범위를 구분한다. 실제 Toss 기기 저장소·센서 권한·배포 환경은 확인하지 않았으며 native Storage/permission 모의 경계에서만 계약을 검증했다. Wallaby 전체 실행은 이전에 CPU가 큰 테스트에서 400ms 실행 제한을 넘었다. 후속 수정으로 관련 42개 검사는 기본 제한에서 통과했지만 전체 Wallaby 재실행을 뜻하지 않는다. 기본 Vitest 전체 단위 실행은 통과했다.

작업은 `codex/refactor-open-issues`의 로컬 변경이며 커밋·PR·원격 이슈 종료·배포는 하지 않았다. 전체 integration 성공은 기존 음악 복원 검사 실패 때문에 아직 확인되지 않았다. 기본 앱 화면은 3100에서 확인했으며 모든 UI 상태·실제 기기·배포 검증은 수행하지 않았다.

### Critical review fix loop (2026-10-01)

[전체 검토·회귀 수정·추가 제안](/Users/bichi/.codex/worktrees/aa4c/web/apps/pomo/docs/plan/development/refactoring-review.md:1)을 별도 기록했다. 동작·리팩터링·이름/구조를 두 차례 검토했고, 브라우저 데이터 손상·읽기 실패가 정상 Toss 자동 음성 설정 복원을 막는 P2 1건을 수정했다. 새 회귀 2개를 포함한 Wallaby 저장소 검사 7개가 모두 통과했다. 나머지 구조·정리 제안은 해당 기록의 연속 번호로 구분했으며 적용하지 않았다.

시간 초과 후속 수정으로 최신 전체 단위 검증은 **기본 400ms·Worker 3개**에서 1,283개 파일·8,495개 테스트가 모두 통과했다(Pomo 8,425개 + audio gateway 70개). 설정이나 테스트별 제한을 늘리지 않고 import 준비·상태별 렌더링·DOM 조회·오디오 조립 경계를 정리했다. 기존 검사 조건은 유지하며 상태·아이콘 케이스를 독립시키면서 테스트 수가 13개 늘었다. 실제 오디오 조립을 포함한 관련 Wallaby 38개와 추가 UI 4개도 400ms에서 통과했다. 자세한 변경과 로그는 위 검토 기록 마지막 절과 검증 JSON의 `criticalReview.timeoutResolution`에 있다. 최신 integration의 기존 음악 복원 검사 1건은 남아 있다. Pomo typecheck와 오류 0개의 lint를 확인했다. PR은 수정하지 않았다.

### 승인된 추가 리팩터링 계획 (2026-10-01)

사용자가 검토 기록의 P3 1~5 및 P4 6을 모두 승인했다.

1. 600줄을 넘는 timer 초기화·동작 검사와 Supertonic 생성/취소 검사를 책임별 파일로 옮기고 fixture를 공유한다. 기존 각 검사 본문과 총 검사 수를 대조한다.
2. Sound Worker 생성 factory와 메시지 타입, WebP Canvas 생성, orientation 권한 runtime을 교체 가능한 경계로 분리한다. 기본 브라우저 구현의 entry URL·encoding 옵션·권한 receiver와 두 sound 소비자의 취소·정리 계약을 유지한다. 기존 prototype/global 교체 검사는 해당 경계로 이동한다.
3. PreferenceOptions의 고정 정의와 storage 필수 결과를 이름 있는 interface로 표현한다.
4. timestamp repository의 세 독립 이진 옵션을 실제 두 일관된 정책으로 제한하고, browser write 오류를 adapter에서 단일 계약으로 정규화한다. theme의 엄격한 실패와 screen-saver의 web fallback·직렬 write·timestamp tie 계약을 유지한다.
5. 자동 음성 브라우저 raw 값을 결정마다 한 번 읽고 공용 decoder로 해석한다. legacy sync API·오류 문구·native 복원을 유지한다.
6. 네 빈 import, 세 isRecord wrapper, text-mood 미사용 import를 정리한다.

완료 조건: 1~6의 구현 위치와 검증 결과를 연결하고, 관련 Wallaby 및 통합 검사, 기본 400ms 전체 단위, Pomo typecheck, oxlint, format을 통과한다. 전체 관련 범위를 동작·구조·이름으로 다시 검토한다. 기존 음악 복원 integration 실패와 실제 기기 검증 한계는 별도로 남기며 PR을 변경하지 않는다.

### 승인 항목 적용 결과

P3 1~5와 P4 6을 모두 적용했다. [검토 기록](./refactoring-review.md)의 마지막 절과 검증 JSON의 `criticalReview.approvedRefactoring`에 구현 위치·검사 증거를 기록했다. 기본 400ms·Worker 3개 전체 단위는 1,290개 파일·8,510개 통과, 관련 Wallaby 156개·통합 54개 통과, 타입 검사·lint·포맷 검사 통과다. 분리 전후 테스트 62개 정의의 AST는 동일하다. 승인 범위의 추가 P0/P1/P2 및 미적용 P3/P4 제안은 없다. 기존 음악 복원 integration 실패 1건과 실제 기기·배포 검증 한계는 유지한다. PR은 수정하지 않았다.
